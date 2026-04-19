export interface ParseResult {
  rows: Record<string, unknown>[];
  columns: string[];
  error?: string;
}

export function parseJSON(text: string): ParseResult {
  try {
    const parsed = JSON.parse(text.trim());
    const arr: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
    if (!arr.length) return { rows: [], columns: [], error: 'Array is empty.' };
    const rows = arr as Record<string, unknown>[];
    const columns = Object.keys(rows[0]);
    return { rows, columns };
  } catch (e) {
    return { rows: [], columns: [], error: `Invalid JSON: ${(e as Error).message}` };
  }
}

export function parseCSV(text: string): ParseResult {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { rows: [], columns: [], error: 'CSV must have a header row and at least one data row.' };

  function splitLine(line: string): string[] {
    const result: string[] = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else { inQuote = !inQuote; }
      } else if (ch === ',' && !inQuote) {
        result.push(cur.trim()); cur = '';
      } else {
        cur += ch;
      }
    }
    result.push(cur.trim());
    return result;
  }

  const columns = splitLine(lines[0]);
  const rows: Record<string, unknown>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const vals = splitLine(lines[i]);
    const row: Record<string, unknown> = {};
    columns.forEach((col, j) => {
      const v = vals[j] ?? '';
      const n = Number(v);
      row[col] = v === '' ? null : !isNaN(n) && v !== '' ? n : v;
    });
    rows.push(row);
  }

  return { rows, columns };
}

export function inferType(values: unknown[]): 'integer' | 'real' | 'text' | 'date' {
  const nonNull = values.filter((v) => v !== null && v !== undefined && v !== '');
  if (!nonNull.length) return 'text';
  if (nonNull.every((v) => typeof v === 'number' && Number.isInteger(v))) return 'integer';
  if (nonNull.every((v) => typeof v === 'number')) return 'real';
  if (nonNull.every((v) => /^\d{4}-\d{2}-\d{2}/.test(String(v)))) return 'date';
  return 'text';
}
