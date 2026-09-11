import { describe, expect, it } from 'vitest';
import { loadState, normalizeImportedState } from '../src/storage/store';

const memoryStorage = (): Storage => {
  const data = new Map<string, string>();
  return { get length(){ return data.size; }, clear(){ data.clear(); }, getItem(k){ return data.get(k) ?? null; }, key(i){ return [...data.keys()][i] ?? null; }, removeItem(k){ data.delete(k); }, setItem(k,v){ data.set(k,v); } };
};

describe('versioned storage migration', () => {
  it('migrates valid legacy keys and preserves zero weight', () => {
    const storage = memoryStorage();
    storage.setItem('records', JSON.stringify([{ id: 1, timestamp: '2024-01-01T00:00:00Z', location: ' LOC-A ', item: 'ITEM-1', weight: 0 }]));
    storage.setItem('theme', 'light');
    const result = loadState(storage);
    expect(result.state.records).toHaveLength(1);
    expect(result.state.records[0]?.weight).toBe(0);
    expect(result.state.theme).toBe('light');
    expect(result.migrated).toBe(true);
    expect(result.safeToPersist).toBe(true);
  });
  it('does not mark corrupted current data safe to overwrite', () => {
    const storage = memoryStorage();
    storage.setItem('trackAndTag.state.v2', '{not-json');
    const result = loadState(storage);
    expect(result.safeToPersist).toBe(false);
    expect(result.warnings[0]).toMatch(/not been overwritten/i);
    expect(storage.getItem('trackAndTag.state.v2')).toBe('{not-json');
  });
  it.each([
    { id: 'r1', timestamp: '2024-01-01T00:00:00Z', location: 'LOC-A', item: 'ITEM-A', weight: null },
    { id: 'r1', timestamp: '2024-01-01T00:00:00Z', location: '   ', item: 'ITEM-A', weight: 1 },
    { id: '', timestamp: 'invalid', location: 'LOC-A', item: 'ITEM-A', weight: 1 },
  ])('does not mark coercively invalid current records safe: $id/$weight', invalidRecord => {
    const storage = memoryStorage();
    storage.setItem('trackAndTag.state.v2', JSON.stringify({ version: 2, records: [invalidRecord], printHistory: [], settings: {
      decimalPlaces: 3, locationRegex: '^LOC', itemRegex: '^ITEM', printCommandRegex: '^PRINT$', saveCommandRegex: '^SAVE$', template: [{ type: 'text', content: '{item}', x: 10, y: 10 }]
    }, theme: 'dark' }));
    const result = loadState(storage);
    expect(result.safeToPersist).toBe(false);
    expect(result.warnings[0]).toMatch(/not been overwritten/i);
  });
  it('preserves malformed legacy source by refusing automatic persistence', () => {
    const storage = memoryStorage();
    storage.setItem('records', JSON.stringify([
      { id: 1, timestamp: '2024-01-01T00:00:00Z', location: 'LOC-A', item: 'ITEM-A', weight: 1 },
      { id: 2, timestamp: '2024-01-01T00:00:00Z', location: '', item: 'ITEM-B', weight: 2 },
    ]));
    storage.setItem('settings', JSON.stringify({ decimalPlaces: 99 }));
    const result = loadState(storage);
    expect(result.state.records).toHaveLength(1);
    expect(result.safeToPersist).toBe(false);
    expect(result.warnings[0]).toMatch(/legacy data.*not been overwritten/i);
  });
  it('rejects duplicate IDs within each persisted collection', () => {
    const storage = memoryStorage();
    const duplicate = { id: 'same', timestamp: '2024-01-01T00:00:00Z', location: 'LOC-A', item: 'ITEM-A', weight: 1 };
    storage.setItem('trackAndTag.state.v2', JSON.stringify({ version: 2, records: [duplicate, {...duplicate, item: 'ITEM-B'}], printHistory: [], settings: {
      decimalPlaces: 3, locationRegex: '^LOC', itemRegex: '^ITEM', printCommandRegex: '^PRINT$', saveCommandRegex: '^SAVE$', template: [{ type: 'text', content: '{item}', x: 10, y: 10 }]
    }, theme: 'dark' }));
    expect(loadState(storage).safeToPersist).toBe(false);
    expect(() => normalizeImportedState(JSON.parse(storage.getItem('trackAndTag.state.v2')!))).toThrow(/duplicate.*ID/i);
  });
  it('falls back to memory when browser storage reads are denied', () => {
    const denied = { getItem(){ throw new DOMException('denied', 'SecurityError'); } } as unknown as Storage;
    const result = loadState(denied);
    expect(result.safeToPersist).toBe(false);
    expect(result.warnings[0]).toMatch(/storage is unavailable/i);
  });
});
