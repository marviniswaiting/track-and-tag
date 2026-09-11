export type Theme = 'dark' | 'light';
export type LabelElement = {
  type: 'text' | 'barcode' | 'qrcode' | 'datamatrix'; content: string; x: number; y: number;
  rot?: number; size?: number; scale?: number; padding?: number; height?: number; width?: number; format?: string; showText?: boolean;
};
export interface Settings { decimalPlaces: number; locationRegex: string; itemRegex: string; printCommandRegex: string; saveCommandRegex: string; template: LabelElement[]; }
export interface RecordEntry { id: string; timestamp: string; location: string; item: string; weight: number; }
export interface AppState { version: 2; records: RecordEntry[]; printHistory: RecordEntry[]; settings: Settings; theme: Theme; }
export const DEFAULT_SETTINGS: Settings = {
  decimalPlaces: 3, printCommandRegex: '^CMD_PRINT$', saveCommandRegex: '^CMD_SAVE$', locationRegex: '^LOC.*$', itemRegex: '^ITEM.*$',
  template: [
    { type: 'text', content: '{location}', x: 15, y: 200, size: 12, rot: 90 },
    { type: 'text', content: '{item}', x: 15, y: 120, size: 15, rot: 90 },
    { type: 'text', content: '{weight}kg', x: 70, y: 180, size: 25, rot: 90 },
    { type: 'datamatrix', content: '{item}', x: 45, y: 45, scale: 2, rot: 90, showText: false }
  ]
};
export const emptyState = (): AppState => ({ version: 2, records: [], printHistory: [], settings: structuredClone(DEFAULT_SETTINGS), theme: 'dark' });
