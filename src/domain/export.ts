import type { AppState, RecordEntry } from './types';
const protect = (value: unknown) => { const text = String(value ?? ''); return /^[\s]*[=+\-@]/.test(text) ? `\t${text}` : text; };
const quote = (value: unknown) => `"${protect(value).replace(/"/g, '""')}"`;
export function recordsToCsv(records: RecordEntry[]): string {
  const rows = [['Timestamp','Location','Item ID','Weight'].map(quote).join(',')];
  rows.push(...records.map(r => [r.timestamp,r.location,r.item,r.weight].map(quote).join(',')));
  return `\ufeff${rows.join('\r\n')}\r\n`;
}
export const backupToJson = (state: AppState) => JSON.stringify({ product: 'Track&Tag', exportedAt: new Date().toISOString(), state }, null, 2);
export async function shareOrDownload(content: string, filename: string, type: string): Promise<'shared'|'downloaded'|'cancelled'> {
  const blob = new Blob([content], { type }); const file = new File([blob], filename, { type });
  if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
    try { await navigator.share({ files: [file], title: filename }); return 'shared'; } catch (e) { if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'; }
  }
  const url = URL.createObjectURL(blob);
  try { const anchor = document.createElement('a'); anchor.href=url; anchor.download=filename; anchor.rel='noopener'; document.body.append(anchor); anchor.click(); anchor.remove(); return 'downloaded'; }
  finally { setTimeout(() => URL.revokeObjectURL(url), 0); }
}
