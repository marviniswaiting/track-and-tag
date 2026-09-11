import type { LabelElement, Settings } from './types';
export type ScanKind = 'print' | 'save' | 'location' | 'item' | 'unknown';
export const normalizeScan = (value: string) => Array.from(value, character => {
  const code = character.codePointAt(0) ?? 0;
  return code <= 31 || code === 127 ? '' : character;
}).join('').trim();
const safeTest = (source: string, value: string) => new RegExp(source).test(value);
export function classifyScan(raw: string, settings: Settings): { kind: ScanKind; value: string } {
  const value = normalizeScan(raw);
  const ordered: [ScanKind, string][] = [['print', settings.printCommandRegex], ['save', settings.saveCommandRegex], ['location', settings.locationRegex], ['item', settings.itemRegex]];
  for (const [kind, regex] of ordered) if (safeTest(regex, value)) return { kind, value };
  return { kind: 'unknown', value };
}
const templateTypes = new Set(['text','barcode','qrcode','datamatrix']);
export function validateTemplate(value: unknown): string | undefined {
  if (!Array.isArray(value) || value.length === 0) return 'Template must be a non-empty array.';
  for (let i=0;i<value.length;i++) {
    const e = value[i] as Partial<LabelElement>;
    if (!e || !templateTypes.has(String(e.type))) return `Element ${i + 1}: unsupported type.`;
    if (typeof e.content !== 'string') return `Element ${i + 1}: content must be text.`;
    if (!Number.isFinite(e.x) || !Number.isFinite(e.y)) return `Element ${i + 1}: x and y must be numbers.`;
    if ((e.x as number) < 0 || (e.x as number) > 96 || (e.y as number) < 0 || (e.y as number) > 240) return `Element ${i + 1}: position must fit the 96×240 label.`;
    for (const key of ['rot','size','scale','padding','height','width'] as const) {
      if (e[key] !== undefined && (!Number.isFinite(e[key]) || (e[key] as number) < 0)) return `Element ${i + 1}: ${key} must be a non-negative number.`;
    }
    if (e.showText !== undefined && typeof e.showText !== 'boolean') return `Element ${i + 1}: showText must be true or false.`;
    if (e.format !== undefined && typeof e.format !== 'string') return `Element ${i + 1}: format must be text.`;
  }
}
export function validateSettings(settings: Settings): Partial<Record<keyof Settings, string>> {
  const errors: Partial<Record<keyof Settings, string>> = {};
  if (!Number.isInteger(settings.decimalPlaces) || settings.decimalPlaces < 0 || settings.decimalPlaces > 6) errors.decimalPlaces = 'Use an integer from 0 to 6.';
  for (const field of ['locationRegex','itemRegex','printCommandRegex','saveCommandRegex'] as const) {
    if (!settings[field]) errors[field] = 'Required.';
    else try { new RegExp(settings[field]); } catch (e) { errors[field] = `Invalid regular expression: ${e instanceof Error ? e.message : 'syntax error'}`; }
  }
  const template = validateTemplate(settings.template); if (template) errors.template = template;
  return errors;
}
