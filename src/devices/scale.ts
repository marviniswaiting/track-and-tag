export const SCALE_SERVICE = 0x181d;
export const SCALE_CHARACTERISTIC = 0x2a9d;
export interface WeightReading { kilograms: number; sourceValue: number; sourceUnit: 'kg' | 'lb' | 'jin'; flags: number; }
export function parseWeightMeasurement(view: DataView): WeightReading {
  if (view.byteLength < 3) throw new Error('Weight packet is too short (expected at least 3 bytes).');
  const flags = view.getUint8(0); let required = 3;
  if (flags & 0x02) { required += 7; if (view.byteLength < required) throw new Error('Weight packet is missing its timestamp fields.'); }
  if (flags & 0x04) { required += 1; if (view.byteLength < required) throw new Error('Weight packet is missing its user ID.'); }
  if (flags & 0x08) { required += 4; if (view.byteLength < required) throw new Error('Weight packet is missing BMI/height fields.'); }
  const raw = view.getUint16(1, true);
  if (raw === 0xffff) throw new Error('Scale reported an unsuccessful measurement.');
  const imperial = Boolean(flags & 0x01);
  // Some commodity scales use reserved bit 4 for jin; retain compatibility with the legacy app.
  const jin = !imperial && Boolean(flags & 0x10);
  const sourceValue = raw * (imperial || jin ? 0.01 : 0.005);
  const kilograms = imperial ? sourceValue / 2.2046226218 : jin ? sourceValue / 2 : sourceValue;
  if (!Number.isFinite(kilograms)) throw new Error('Scale returned an invalid weight.');
  return { kilograms, sourceValue, sourceUnit: imperial ? 'lb' : jin ? 'jin' : 'kg', flags };
}
export interface ScaleCharacteristic extends EventTarget { startNotifications(): Promise<ScaleCharacteristic>; stopNotifications?(): Promise<ScaleCharacteristic>; value?: DataView; }
interface ScaleDevice extends EventTarget { gatt?: { connect(): Promise<{ getPrimaryService(id: number): Promise<{ getCharacteristic(id: number): Promise<ScaleCharacteristic> }> }>; connected: boolean; disconnect(): void }; }
interface BluetoothLike { requestDevice(options: unknown): Promise<ScaleDevice>; }
export async function pairScale(bluetooth: BluetoothLike, onWeight: (reading: WeightReading) => void, onError?: (error: Error) => void): Promise<{ device: ScaleDevice; characteristic: ScaleCharacteristic; disconnect: () => Promise<void> }> {
  const device = await bluetooth.requestDevice({ filters: [{ services: [SCALE_SERVICE] }] });
  if (!device.gatt) throw new Error('Selected scale has no GATT server.');
  let characteristic: ScaleCharacteristic | undefined;
  let listener: ((event: Event) => void) | undefined;
  try {
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(SCALE_SERVICE);
    characteristic = await service.getCharacteristic(SCALE_CHARACTERISTIC);
    listener = (event: Event) => {
      const value = (event.target as ScaleCharacteristic).value;
      if (!value) return;
      try { onWeight(parseWeightMeasurement(value)); }
      catch (error) { onError?.(error instanceof Error ? error : new Error('Scale returned an invalid packet.')); }
    };
    characteristic.addEventListener('characteristicvaluechanged', listener);
    await characteristic.startNotifications();
    const activeCharacteristic = characteristic;
    const activeListener = listener;
    return { device, characteristic, disconnect: async () => { activeCharacteristic.removeEventListener('characteristicvaluechanged', activeListener); try { await activeCharacteristic.stopNotifications?.(); } finally { if (device.gatt?.connected) device.gatt.disconnect(); } } };
  } catch (error) {
    if (characteristic && listener) characteristic.removeEventListener('characteristicvaluechanged', listener);
    if (device.gatt.connected) device.gatt.disconnect();
    throw error;
  }
}
