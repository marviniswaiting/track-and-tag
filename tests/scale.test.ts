import { describe, expect, it, vi } from 'vitest';
import { pairScale, parseWeightMeasurement } from '../src/devices/scale';

describe('BLE weight measurement', () => {
  it('rejects short packets and parses the unsigned SIG weight field', () => {
    expect(() => parseWeightMeasurement(new DataView(new Uint8Array([0]).buffer))).toThrow(/short/i);
    const bytes = new Uint8Array([0, 0x10, 0]);
    expect(parseWeightMeasurement(new DataView(bytes.buffer))).toEqual(expect.objectContaining({ kilograms: 0.08, sourceUnit: 'kg' }));
  });
  it('rejects the SIG measurement-unsuccessful sentinel', () => {
    const bytes = new Uint8Array([0, 0xff, 0xff]);
    expect(() => parseWeightMeasurement(new DataView(bytes.buffer))).toThrow(/unsuccessful/i);
  });
  it('retains compatibility with scales using reserved bit 4 for jin', () => {
    const bytes = new Uint8Array([0x10, 200, 0]); // 2 jin = 1 kg
    expect(parseWeightMeasurement(new DataView(bytes.buffer))).toEqual(expect.objectContaining({ kilograms: 1, sourceUnit: 'jin' }));
  });
  it('converts imperial weight and validates flagged optional fields', () => {
    const bytes = new Uint8Array([1, 0xdc, 0]);
    expect(parseWeightMeasurement(new DataView(bytes.buffer)).kilograms).toBeCloseTo(0.997903, 5);
    expect(() => parseWeightMeasurement(new DataView(new Uint8Array([2, 1, 0]).buffer))).toThrow(/timestamp/i);
  });
  it('disconnects and removes its listener when notification setup fails', async () => {
    const characteristic = Object.assign(new EventTarget(), { startNotifications: vi.fn().mockRejectedValue(new Error('denied')) });
    const disconnect = vi.fn();
    const device = Object.assign(new EventTarget(), { gatt: { connected: true, disconnect, connect: vi.fn().mockResolvedValue({ getPrimaryService: vi.fn().mockResolvedValue({ getCharacteristic: vi.fn().mockResolvedValue(characteristic) }) }) } });
    const bluetooth = { requestDevice: vi.fn().mockResolvedValue(device) } as unknown as Parameters<typeof pairScale>[0];
    await expect(pairScale(bluetooth, vi.fn())).rejects.toThrow('denied');
    expect(disconnect).toHaveBeenCalledOnce();
  });
  it('reports malformed notification packets without crashing the event handler', async () => {
    const characteristic = Object.assign(new EventTarget(), { value: new DataView(new Uint8Array([0]).buffer), startNotifications: vi.fn().mockImplementation(function(this: EventTarget){ return Promise.resolve(this); }) });
    const device = Object.assign(new EventTarget(), { gatt: { connected: true, disconnect: vi.fn(), connect: vi.fn().mockResolvedValue({ getPrimaryService: vi.fn().mockResolvedValue({ getCharacteristic: vi.fn().mockResolvedValue(characteristic) }) }) } });
    const bluetooth = { requestDevice: vi.fn().mockResolvedValue(device) } as unknown as Parameters<typeof pairScale>[0];
    const onError = vi.fn();
    await pairScale(bluetooth, vi.fn(), onError);
    characteristic.dispatchEvent(new Event('characteristicvaluechanged'));
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/short/i) }));
  });
});
