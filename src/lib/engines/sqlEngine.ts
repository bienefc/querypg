import { Dataset, QueryResult } from '@/types';

type SqlJsModule = typeof import('sql.js');
type Database = InstanceType<Awaited<ReturnType<SqlJsModule['default']>>['Database']>;

let SQL: Awaited<ReturnType<SqlJsModule['default']>> | null = null;
const dbCache: Record<string, Database> = {};

export function invalidateCache(datasetId: string) {
  if (dbCache[datasetId]) {
    dbCache[datasetId].close();
    delete dbCache[datasetId];
  }
}

async function getSQL() {
  if (SQL) return SQL;
  const initSqlJs = (await import('sql.js')).default;
  SQL = await initSqlJs({
    locateFile: () => '/sql-wasm.wasm',
  });
  return SQL;
}

function seedDatabase(sql: Awaited<ReturnType<SqlJsModule['default']>>, dataset: Dataset): Database {
  const db = new sql.Database();
  for (const [tableName, rows] of Object.entries(dataset.tables)) {
    if (!rows.length) continue;
    const cols = Object.keys(rows[0]);
    const colDefs = cols.map((c) => `"${c}" TEXT`).join(', ');
    db.run(`CREATE TABLE IF NOT EXISTS "${tableName}" (${colDefs})`);
    const placeholders = cols.map(() => '?').join(', ');
    const stmt = db.prepare(
      `INSERT INTO "${tableName}" (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders})`
    );
    for (const row of rows) {
      stmt.run(cols.map((c) => row[c] as string | number | null));
    }
    stmt.free();
  }
  return db;
}

async function getDb(dataset: Dataset): Promise<Database> {
  if (dbCache[dataset.id]) return dbCache[dataset.id];
  const sql = await getSQL();
  const db = seedDatabase(sql, dataset);
  dbCache[dataset.id] = db;
  return db;
}

function preprocessPostgres(query: string): string {
  return query
    .replace(/::integer/gi, '')
    .replace(/::text/gi, '')
    .replace(/::numeric/gi, '')
    .replace(/::float/gi, '')
    .replace(/ILIKE\s+/gi, (m) => m.replace(/ILIKE/i, 'LIKE'))
    .replace(/RETURNING\s+[^\n;]*/gi, '');
}

export async function runSql(
  query: string,
  dataset: Dataset,
  mode: 'sql' | 'postgresql' = 'sql'
): Promise<QueryResult> {
  const start = performance.now();
  try {
    const db = await getDb(dataset);
    const processedQuery = mode === 'postgresql' ? preprocessPostgres(query) : query;
    const results = db.exec(processedQuery);
    const executionMs = Math.round(performance.now() - start);
    if (!results.length) {
      return { status: 'success', rows: [], columns: [], rowCount: 0, executionMs };
    }
    const { columns, values } = results[results.length - 1];
    const rows = values.map((vals) => {
      const row: Record<string, unknown> = {};
      columns.forEach((col, i) => { row[col] = vals[i]; });
      return row;
    });
    return { status: 'success', rows, columns, rowCount: rows.length, executionMs };
  } catch (err) {
    return {
      status: 'error',
      rows: [],
      columns: [],
      rowCount: 0,
      executionMs: Math.round(performance.now() - start),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
