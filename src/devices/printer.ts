export const PRINTER_SERVICE = '0000ff00-0000-1000-8000-00805f9b34fb';
export const PRINTER_CHARACTERISTIC = '0000ff02-0000-1000-8000-00805f9b34fb';
export interface PrinterCharacteristic {
  properties: { write?: boolean; writeWithoutResponse?: boolean };
  writeValue?(value: BufferSource): Promise<void>;
  writeValueWithResponse?(value: BufferSource): Promise<void>;
  writeValueWithoutResponse?(value: BufferSource): Promise<void>;
}
const pause = (ms: number) => ms > 0 ? new Promise<void>(resolve => setTimeout(resolve, ms)) : Promise.resolve();
export async function writePrinterBytes(characteristic: PrinterCharacteristic, bytes: Uint8Array, chunkSize = 100, delayMs = 18): Promise<void> {
  if (!Number.isInteger(chunkSize) || chunkSize < 1 || chunkSize > 512) throw new Error('Invalid printer chunk size.');
  let write: ((value: BufferSource) => Promise<void>) | undefined;
  if (characteristic.properties.writeWithoutResponse && characteristic.writeValueWithoutResponse) write = characteristic.writeValueWithoutResponse.bind(characteristic);
  else if (characteristic.properties.write && characteristic.writeValueWithResponse) write = characteristic.writeValueWithResponse.bind(characteristic);
  else if (characteristic.properties.write && characteristic.writeValue) write = characteristic.writeValue.bind(characteristic);
  if (!write) throw new Error('Printer characteristic does not support a compatible write method.');
  for (let offset=0; offset<bytes.byteLength; offset+=chunkSize) { await write(bytes.slice(offset, offset+chunkSize)); await pause(delayMs); }
}
interface PrinterDevice extends EventTarget { gatt?: { connect(): Promise<{ getPrimaryService(id: string): Promise<{ getCharacteristic(id: string): Promise<PrinterCharacteristic> }> }>; connected: boolean; disconnect(): void }; }
interface BluetoothLike { requestDevice(options: unknown): Promise<PrinterDevice>; }
export async function pairPrinter(bluetooth: BluetoothLike): Promise<{ device: PrinterDevice; characteristic: PrinterCharacteristic; disconnect: () => void }> {
  const device = await bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: [PRINTER_SERVICE] });
  if (!device.gatt) throw new Error('Selected printer has no GATT server.');
  try {
    const server = await device.gatt.connect(); const service = await server.getPrimaryService(PRINTER_SERVICE); const characteristic = await service.getCharacteristic(PRINTER_CHARACTERISTIC);
    if (!(characteristic.properties.writeWithoutResponse || characteristic.properties.write)) throw new Error('Printer write characteristic is not writable.');
    return { device, characteristic, disconnect: () => { if (device.gatt?.connected) device.gatt.disconnect(); } };
  } catch (error) {
    if (device.gatt.connected) device.gatt.disconnect();
    throw error;
  }
}
export async function sendPrintJob(characteristic: PrinterCharacteristic, raster: Uint8Array, timing = { rasterSettleMs: 500, feedSettleMs: 300 }): Promise<void> {
  const commands = [new Uint8Array([0x10,0xff,0x84,0]), new Uint8Array(12), new Uint8Array([0x10,0xff,0xfe,1])];
  for (const command of commands) await writePrinterBytes(characteristic, command);
  await writePrinterBytes(characteristic, raster);
  await pause(timing.rasterSettleMs);
  await writePrinterBytes(characteristic, new Uint8Array([0x1d,0x0c]));
  await pause(timing.feedSettleMs);
  await writePrinterBytes(characteristic, new Uint8Array([0x10,0xff,0xfe,0x45]));
}
