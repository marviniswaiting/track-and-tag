import { describe, expect, it } from 'vitest';
import { recordsToCsv } from '../src/domain/export';

describe('CSV export', () => {
  it('adds a BOM, RFC4180 quotes and protects spreadsheet formulas', () => {
    const csv = recordsToCsv([{ id:'x', timestamp:'2024-01-01T00:00:00Z', location:'A,"B"', item:'=CMD()', weight:0 }]);
    expect(csv.startsWith('\ufeff')).toBe(true);
    expect(csv).toContain('"A,""B"""');
    expect(csv).toContain("\t=CMD()");
    expect(csv).toContain('\r\n');
  });
});
