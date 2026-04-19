import { EvalOptions, EvaluationFeedback, MismatchedRow, QueryResult } from '@/types';

function normalizeValue(val: unknown, caseSensitive: boolean): unknown {
  if (val === null || val === undefined) return '__NULL__';
  if (typeof val === 'boolean') return val;
  const n = Number(val);
  if (!isNaN(n) && String(val).trim() !== '') return n;
  const s = String(val).trim();
  // Try date normalization
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return caseSensitive ? s : s.toLowerCase();
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === '__NULL__' && b === '__NULL__') return true;
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) < 0.0001;
  }
  return a === b;
}

function rowKey(row: Record<string, unknown>, cols: string[], caseSensitive: boolean): string {
  return cols
    .sort()
    .map((c) => JSON.stringify(normalizeValue(row[c], caseSensitive)))
    .join('|');
}

function diffRow(
  expected: Record<string, unknown>,
  actual: Record<string, unknown>,
  cols: string[],
  caseSensitive: boolean
): string[] {
  return cols.filter(
    (c) => !valuesEqual(normalizeValue(expected[c], caseSensitive), normalizeValue(actual[c], caseSensitive))
  );
}

export function evaluate(
  expected: QueryResult,
  actual: QueryResult,
  opts: Partial<EvalOptions> = {}
): EvaluationFeedback {
  const { orderSensitive = false, ignoreColumnOrder = true, caseSensitive = false } = opts;

  if (actual.status === 'error') {
    return {
      passed: false,
      rowCountMatch: false,
      columnsMatch: false,
      dataMatch: false,
      orderMatch: false,
      mismatchedRows: [],
      message: `Your query produced an error: ${actual.error}`,
    };
  }

  // Column comparison
  const normalizeCol = (c: string) => c.trim().toLowerCase();
  const eCols = expected.columns.map(normalizeCol);
  const aCols = actual.columns.map(normalizeCol);
  const sortedE = ignoreColumnOrder ? [...eCols].sort() : eCols;
  const sortedA = ignoreColumnOrder ? [...aCols].sort() : aCols;
  const columnsMatch = sortedE.join(',') === sortedA.join(',');

  if (!columnsMatch) {
    const missing = eCols.filter((c) => !aCols.includes(c));
    const extra = aCols.filter((c) => !eCols.includes(c));
    const parts: string[] = [];
    if (missing.length) parts.push(`Missing columns: ${missing.join(', ')}`);
    if (extra.length) parts.push(`Unexpected columns: ${extra.join(', ')}`);
    return {
      passed: false,
      rowCountMatch: expected.rowCount === actual.rowCount,
      columnsMatch: false,
      dataMatch: false,
      orderMatch: false,
      mismatchedRows: [],
      message: parts.join('. ') || 'Column names do not match.',
    };
  }

  const rowCountMatch = expected.rowCount === actual.rowCount;
  const cols = eCols; // normalized column names, use these for comparison

  // Build comparable rows using the actual column mapping
  function mapRow(row: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const c of cols) {
      // find matching key in row (may be original case)
      const origKey = Object.keys(row).find((k) => k.toLowerCase() === c) ?? c;
      out[c] = row[origKey];
    }
    return out;
  }

  const eRows = expected.rows.map(mapRow);
  const aRows = actual.rows.map(mapRow);

  const mismatchedRows: MismatchedRow[] = [];

  if (orderSensitive) {
    const len = Math.max(eRows.length, aRows.length);
    for (let i = 0; i < len; i++) {
      if (i >= eRows.length || i >= aRows.length) {
        mismatchedRows.push({ rowIndex: i, expected: eRows[i] ?? {}, actual: aRows[i] ?? {}, diffFields: cols });
        continue;
      }
      const diff = diffRow(eRows[i], aRows[i], cols, caseSensitive);
      if (diff.length) mismatchedRows.push({ rowIndex: i, expected: eRows[i], actual: aRows[i], diffFields: diff });
    }
  } else {
    // Build frequency map for expected rows
    const expectedFreq = new Map<string, number>();
    for (const r of eRows) {
      const k = rowKey(r, cols, caseSensitive);
      expectedFreq.set(k, (expectedFreq.get(k) ?? 0) + 1);
    }
    const actualFreq = new Map<string, number>();
    for (const r of aRows) {
      const k = rowKey(r, cols, caseSensitive);
      actualFreq.set(k, (actualFreq.get(k) ?? 0) + 1);
    }
    // Find expected rows not matched in actual
    let idx = 0;
    for (const r of eRows) {
      const k = rowKey(r, cols, caseSensitive);
      const exp = expectedFreq.get(k) ?? 0;
      const act = actualFreq.get(k) ?? 0;
      if (act < exp) {
        // Find a close actual row by finding smallest diff
        const actualRow = aRows[idx] ?? {};
        const diff = diffRow(r, actualRow, cols, caseSensitive);
        mismatchedRows.push({ rowIndex: idx, expected: r, actual: actualRow, diffFields: diff });
      }
      idx++;
    }
  }

  const dataMatch = mismatchedRows.length === 0;
  const orderMatch = orderSensitive ? dataMatch : true;
  const passed = columnsMatch && rowCountMatch && dataMatch;

  let message = '';
  if (passed) {
    message = 'Correct! Your query matches the expected output.';
  } else {
    const parts: string[] = [];
    if (!rowCountMatch) {
      parts.push(`Expected ${expected.rowCount} row${expected.rowCount !== 1 ? 's' : ''}, got ${actual.rowCount}.`);
    }
    if (!dataMatch && mismatchedRows.length) {
      const first = mismatchedRows[0];
      parts.push(
        `Row ${first.rowIndex + 1} differs in: ${first.diffFields.map((f) => `"${f}"`).join(', ')}.`
      );
      if (mismatchedRows.length > 1) {
        parts.push(`(${mismatchedRows.length - 1} more row${mismatchedRows.length > 2 ? 's' : ''} also differ.)`);
      }
    }
    message = parts.join(' ') || 'Output does not match.';
  }

  return { passed, rowCountMatch, columnsMatch, dataMatch, orderMatch, mismatchedRows, message };
}
