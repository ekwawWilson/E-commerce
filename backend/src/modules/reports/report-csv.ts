export interface CsvColumn<T> {
  header: string;
  value: (row: T) => unknown;
}

/**
 * Escape one CSV cell. Cells that start with = + - @ are prefixed with an
 * apostrophe so a spreadsheet opens them as text rather than running them as
 * formulas (customer names and notes are user-supplied).
 */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const lines = [columns.map((c) => csvCell(c.header)).join(',')];
  for (const row of rows) {
    lines.push(columns.map((c) => csvCell(c.value(row))).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}
