import { describe, expect, it } from 'vitest';
import { classifyScan, normalizeScan, validateSettings } from '../src/domain/scan';
import { DEFAULT_SETTINGS } from '../src/domain/types';

describe('scan processing', () => {
  it('normalizes wedge suffixes and classifies repeatedly with stateful-looking patterns', () => {
    const settings = { ...DEFAULT_SETTINGS, locationRegex: '^LOC-\\d+$' };
    expect(normalizeScan('  LOC-12\r\n')).toBe('LOC-12');
    expect(classifyScan('LOC-12', settings).kind).toBe('location');
    expect(classifyScan('LOC-12', settings).kind).toBe('location');
  });
  it('reports the specific invalid regex field', () => {
    expect(validateSettings({ ...DEFAULT_SETTINGS, itemRegex: '[' })).toEqual(expect.objectContaining({ itemRegex: expect.stringContaining('Invalid') }));
  });
  it('rejects label elements that are out of bounds or incorrectly typed', () => {
    expect(validateSettings({ ...DEFAULT_SETTINGS, template: [{ type:'text', content:'x', x:97, y:0 }] })).toEqual(expect.objectContaining({ template: expect.stringContaining('position') }));
    expect(validateSettings({ ...DEFAULT_SETTINGS, template: [{ type:'text', content:'x', x:0, y:0, showText:'yes' }] as never })).toEqual(expect.objectContaining({ template: expect.stringContaining('showText') }));
  });
});
