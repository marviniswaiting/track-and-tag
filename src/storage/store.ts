import { AppState, DEFAULT_SETTINGS, emptyState, type RecordEntry, type Settings, type Theme } from '../domain/types';
import { validateSettings } from '../domain/scan';
export const STORAGE_KEY = 'trackAndTag.state.v2';
export interface LoadResult { state: AppState; migrated: boolean; warnings: string[]; safeToPersist: boolean; }
const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const string = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
function record(v: unknown, legacy = false): RecordEntry | null {
  if (!object(v) || !string(v.location) || !v.location.trim() || !string(v.item) || !v.item.trim() || typeof v.weight !== 'number' || !Number.isFinite(v.weight) || v.weight < 0) return null;
  const validId = string(v.id) || (legacy && (typeof v.id === 'number' || typeof v.id === 'bigint'));
  if (!validId || !string(v.timestamp) || Number.isNaN(Date.parse(v.timestamp))) return null;
  return { id: String(v.id), timestamp: v.timestamp, location: v.location.trim(), item: v.item.trim(), weight: v.weight };
}
const records = (v: unknown, legacy = false) => Array.isArray(v) ? v.map(value => record(value, legacy)).filter((x): x is RecordEntry => x !== null) : [];
const uniqueIds = (entries: RecordEntry[]) => new Set(entries.map(entry => entry.id)).size === entries.length;
const recordsUnchanged = (raw: unknown, normalized: RecordEntry[]) => Array.isArray(raw) && raw.length === normalized.length && normalized.every((entry, index) => {
  const source = raw[index];
  return object(source) && source.id === entry.id && source.timestamp === entry.timestamp && source.location === entry.location && source.item === entry.item && source.weight === entry.weight;
});
function settings(v: unknown): Settings {
  if (!object(v)) return structuredClone(DEFAULT_SETTINGS);
  const candidate: Settings = {
    decimalPlaces: Number.isInteger(v.decimalPlaces) && Number(v.decimalPlaces) >= 0 && Number(v.decimalPlaces) <= 6 ? Number(v.decimalPlaces) : DEFAULT_SETTINGS.decimalPlaces,
    locationRegex: typeof v.locationRegex === 'string' ? v.locationRegex : DEFAULT_SETTINGS.locationRegex,
    itemRegex: typeof v.itemRegex === 'string' ? v.itemRegex : DEFAULT_SETTINGS.itemRegex,
    printCommandRegex: typeof v.printCommandRegex === 'string' ? v.printCommandRegex : DEFAULT_SETTINGS.printCommandRegex,
    saveCommandRegex: typeof v.saveCommandRegex === 'string' ? v.saveCommandRegex : DEFAULT_SETTINGS.saveCommandRegex,
    template: Array.isArray(v.template) ? v.template as Settings['template'] : structuredClone(DEFAULT_SETTINGS.template)
  };
  const invalid = validateSettings(candidate);
  return {
    decimalPlaces: invalid.decimalPlaces ? DEFAULT_SETTINGS.decimalPlaces : candidate.decimalPlaces,
    locationRegex: invalid.locationRegex ? DEFAULT_SETTINGS.locationRegex : candidate.locationRegex,
    itemRegex: invalid.itemRegex ? DEFAULT_SETTINGS.itemRegex : candidate.itemRegex,
    printCommandRegex: invalid.printCommandRegex ? DEFAULT_SETTINGS.printCommandRegex : candidate.printCommandRegex,
    saveCommandRegex: invalid.saveCommandRegex ? DEFAULT_SETTINGS.saveCommandRegex : candidate.saveCommandRegex,
    template: invalid.template ? structuredClone(DEFAULT_SETTINGS.template) : candidate.template
  };
}
const parse = (storage: Storage, key: string): unknown => { try { const raw = storage.getItem(key); return raw ? JSON.parse(raw) : undefined; } catch { return undefined; } };
function loadStateUnsafe(storage: Storage): LoadResult {
  const currentRaw = storage.getItem(STORAGE_KEY);
  const current = parse(storage, STORAGE_KEY);
  if (currentRaw !== null) {
    if (!object(current) || current.version !== 2 || !Array.isArray(current.records) || !Array.isArray(current.printHistory) || !object(current.settings)) {
      return { state: emptyState(), migrated: false, warnings: ['Stored data is invalid and has not been overwritten. Restore a backup or reset local data.'], safeToPersist: false };
    }
    const normalizedRecords = records(current.records); const normalizedPrints = records(current.printHistory);
    const invalid = Object.keys(validateSettings(current.settings as unknown as Settings)).length > 0;
    const safeToPersist = recordsUnchanged(current.records, normalizedRecords) && recordsUnchanged(current.printHistory, normalizedPrints) && uniqueIds(normalizedRecords) && uniqueIds(normalizedPrints) && !invalid && (current.theme === 'light' || current.theme === 'dark');
    return { state: { version: 2, records: normalizedRecords, printHistory: normalizedPrints, settings: settings(current.settings), theme: current.theme === 'light' ? 'light' : 'dark' }, migrated: false, warnings: safeToPersist ? [] : ['Some stored data is invalid and has not been overwritten. Restore a backup or reset local data.'], safeToPersist };
  }
  const legacyPresent = ['records','printHistory','settings','theme'].some(k => storage.getItem(k) !== null);
  if (!legacyPresent) return { state: emptyState(), migrated: false, warnings: [], safeToPersist: true };
  const legacyRecordsRaw = parse(storage,'records'); const legacyPrintsRaw = parse(storage,'printHistory'); const legacySettingsRaw = parse(storage,'settings'); const legacyThemeRaw = storage.getItem('theme');
  const normalizedRecords = records(legacyRecordsRaw, true); const normalizedPrints = records(legacyPrintsRaw, true);
  const recordsSafe = storage.getItem('records') === null || (Array.isArray(legacyRecordsRaw) && normalizedRecords.length === legacyRecordsRaw.length && uniqueIds(normalizedRecords));
  const printsSafe = storage.getItem('printHistory') === null || (Array.isArray(legacyPrintsRaw) && normalizedPrints.length === legacyPrintsRaw.length && uniqueIds(normalizedPrints));
  const settingsSafe = storage.getItem('settings') === null || (object(legacySettingsRaw) && Object.keys(validateSettings(legacySettingsRaw as unknown as Settings)).length === 0);
  const themeSafe = legacyThemeRaw === null || legacyThemeRaw === 'light' || legacyThemeRaw === 'dark';
  const safeToPersist = recordsSafe && printsSafe && settingsSafe && themeSafe;
  const theme: Theme = legacyThemeRaw === 'light' ? 'light' : 'dark';
  return { state: { version: 2, records: normalizedRecords, printHistory: normalizedPrints, settings: settings(legacySettingsRaw), theme }, migrated: true, warnings: safeToPersist ? [] : ['Some legacy data is invalid and has not been overwritten. Export the remaining data, restore a backup, or reset local data.'], safeToPersist };
}
export function loadState(storage: Storage): LoadResult {
  try { return loadStateUnsafe(storage); }
  catch (error) {
    const reason = error instanceof Error ? error.message : 'Storage access was denied.';
    return { state: emptyState(), migrated: false, warnings: [`Browser storage is unavailable; changes will remain in memory only. ${reason}`], safeToPersist: false };
  }
}
export function normalizeImportedState(value: unknown): AppState {
  if (!object(value)) throw new Error('Backup must contain an object.');
  if (value.version !== 2 && value.version !== 1) throw new Error('Unsupported backup version.');
  if (!Array.isArray(value.records) || !Array.isArray(value.printHistory) || !object(value.settings)) throw new Error('Backup is missing records, print history, or settings.');
  const normalized = { version: 2 as const, records: records(value.records), printHistory: records(value.printHistory), settings: settings(value.settings), theme: value.theme === 'light' ? 'light' as const : 'dark' as const };
  if (normalized.records.length !== value.records.length || normalized.printHistory.length !== value.printHistory.length) throw new Error('Backup contains invalid record entries.');
  if (!uniqueIds(normalized.records) || !uniqueIds(normalized.printHistory)) throw new Error('Backup contains duplicate record IDs.');
  if (Object.keys(validateSettings(value.settings as unknown as Settings)).length) throw new Error('Backup contains invalid settings.');
  return normalized;
}
export function saveState(storage: Storage, state: AppState): { ok: true } | { ok: false; error: string } {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(state)); return { ok: true }; } catch (error) { return { ok: false, error: error instanceof Error ? error.message : 'Storage write failed' }; }
}
export function clearAll(storage: Storage): void { storage.removeItem(STORAGE_KEY); for (const key of ['records','printHistory','settings','theme']) storage.removeItem(key); }
