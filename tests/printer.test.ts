import { describe, expect, it, vi } from 'vitest';
import { pairPrinter, writePrinterBytes } from '../src/devices/printer';

describe('BLE printer writes', () => {
  it('uses supported write method and safe chunks', async () => {
    const writeValue = vi.fn().mockResolvedValue(undefined);
    await writePrinterBytes({ properties: { write: true, writeWithoutResponse: false }, writeValue }, new Uint8Array(45), 20, 0);
    expect(writeValue).toHaveBeenCalledTimes(3);
    expect(writeValue.mock.calls.map(call => call[0].byteLength)).toEqual([20,20,5]);
  });
  it('rejects a characteristic with no write support', async () => {
    await expect(writePrinterBytes({ properties: {} }, new Uint8Array([1]))).rejects.toThrow(/write/i);
  });
  it('disconnects when service discovery fails', async () => {
    const disconnect = vi.fn();
    const device = Object.assign(new EventTarget(), { gatt: { connected: true, disconnect, connect: vi.fn().mockResolvedValue({ getPrimaryService: vi.fn().mockRejectedValue(new Error('missing service')) }) } });
    const bluetooth = { requestDevice: vi.fn().mockResolvedValue(device) } as unknown as Parameters<typeof pairPrinter>[0];
    await expect(pairPrinter(bluetooth)).rejects.toThrow('missing service');
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
