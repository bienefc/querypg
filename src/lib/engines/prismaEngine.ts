import { Dataset, QueryResult } from '@/types';

// ─── Tokenizer ────────────────────────────────────────────────────────────────

type Token =
  | { type: 'ident'; value: string }
  | { type: 'dot' }
  | { type: 'lparen' }
  | { type: 'rparen' }
  | { type: 'lbrace' }
  | { type: 'rbrace' }
  | { type: 'lbracket' }
  | { type: 'rbracket' }
  | { type: 'colon' }
  | { type: 'comma' }
  | { type: 'string'; value: string }
  | { type: 'number'; value: number }
  | { type: 'bool'; value: boolean }
  | { type: 'null' }
  | { type: 'eof' };

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === '.' && src[i + 1] !== '.') { tokens.push({ type: 'dot' }); i++; continue; }
    if (ch === '(') { tokens.push({ type: 'lparen' }); i++; continue; }
    if (ch === ')') { tokens.push({ type: 'rparen' }); i++; continue; }
    if (ch === '{') { tokens.push({ type: 'lbrace' }); i++; continue; }
    if (ch === '}') { tokens.push({ type: 'rbrace' }); i++; continue; }
    if (ch === '[') { tokens.push({ type: 'lbracket' }); i++; continue; }
    if (ch === ']') { tokens.push({ type: 'rbracket' }); i++; continue; }
    if (ch === ':') { tokens.push({ type: 'colon' }); i++; continue; }
    if (ch === ',') { tokens.push({ type: 'comma' }); i++; continue; }
    if (ch === '"' || ch === "'") {
      const q = ch; i++;
      let s = '';
      while (i < src.length && src[i] !== q) {
        if (src[i] === '\\') { i++; s += src[i]; } else { s += src[i]; }
        i++;
      }
      i++;
      tokens.push({ type: 'string', value: s });
      continue;
    }
    if (/\d/.test(ch) || (ch === '-' && /\d/.test(src[i + 1]))) {
      let s = ch; i++;
      while (i < src.length && /[\d.]/.test(src[i])) { s += src[i]; i++; }
      tokens.push({ type: 'number', value: Number(s) });
      continue;
    }
    if (/[a-zA-Z_$]/.test(ch)) {
      let s = '';
      while (i < src.length && /[\w$]/.test(src[i])) { s += src[i]; i++; }
      if (s === 'true') tokens.push({ type: 'bool', value: true });
      else if (s === 'false') tokens.push({ type: 'bool', value: false });
      else if (s === 'null' || s === 'undefined') tokens.push({ type: 'null' });
      else tokens.push({ type: 'ident', value: s });
      continue;
    }
    i++;
  }
  tokens.push({ type: 'eof' });
  return tokens;
}

// ─── Parser ───────────────────────────────────────────────────────────────────

class Parser {
  private pos = 0;
  constructor(private tokens: Token[]) {}

  peek(): Token { return this.tokens[this.pos]; }
  consume(): Token { return this.tokens[this.pos++]; }

  expect(type: Token['type']): Token {
    const t = this.consume();
    if (t.type !== type) throw new Error(`Expected ${type}, got ${t.type}`);
    return t;
  }

  // Parse a JS object literal
  parseObject(): Record<string, unknown> {
    this.expect('lbrace');
    const obj: Record<string, unknown> = {};
    while (this.peek().type !== 'rbrace' && this.peek().type !== 'eof') {
      const key = this.parseKey();
      this.expect('colon');
      obj[key] = this.parseValue();
      if (this.peek().type === 'comma') this.consume();
    }
    this.expect('rbrace');
    return obj;
  }

  parseKey(): string {
    const t = this.consume();
    if (t.type === 'ident') return t.value;
    if (t.type === 'string') return t.value;
    throw new Error(`Expected object key, got ${t.type}`);
  }

  parseValue(): unknown {
    const t = this.peek();
    if (t.type === 'lbrace') return this.parseObject();
    if (t.type === 'lbracket') return this.parseArray();
    if (t.type === 'string') { this.consume(); return (t as { type: 'string'; value: string }).value; }
    if (t.type === 'number') { this.consume(); return (t as { type: 'number'; value: number }).value; }
    if (t.type === 'bool') { this.consume(); return (t as { type: 'bool'; value: boolean }).value; }
    if (t.type === 'null') { this.consume(); return null; }
    throw new Error(`Unexpected token: ${t.type}`);
  }

  parseArray(): unknown[] {
    this.expect('lbracket');
    const arr: unknown[] = [];
    while (this.peek().type !== 'rbracket' && this.peek().type !== 'eof') {
      arr.push(this.parseValue());
      if (this.peek().type === 'comma') this.consume();
    }
    this.expect('rbracket');
    return arr;
  }

  // Parse prisma.Model.method({ ... })
  parsePrismaCall(): { model: string; method: string; args: Record<string, unknown> } {
    // allow "await prisma.model.method(...)"
    if (this.peek().type === 'ident' && (this.peek() as { type: 'ident'; value: string }).value === 'await') {
      this.consume();
    }
    const prismaToken = this.consume();
    if (prismaToken.type !== 'ident') throw new Error('Expected "prisma"');
    this.expect('dot');
    const modelToken = this.consume() as { type: 'ident'; value: string };
    this.expect('dot');
    const methodToken = this.consume() as { type: 'ident'; value: string };
    this.expect('lparen');
    let args: Record<string, unknown> = {};
    if (this.peek().type === 'lbrace') {
      args = this.parseObject();
    }
    this.expect('rparen');
    return { model: modelToken.value, method: methodToken.value, args };
  }
}

// ─── Executor ─────────────────────────────────────────────────────────────────

function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

function normalizeKey(key: string, row: Record<string, unknown>): string {
  if (key in row) return key;
  const snaked = camelToSnake(key);
  if (snaked in row) return snaked;
  return key;
}

function matchesWhere(row: Record<string, unknown>, where: Record<string, unknown>): boolean {
  for (const [key, condition] of Object.entries(where)) {
    if (key === 'AND') {
      const clauses = condition as Record<string, unknown>[];
      if (!clauses.every((c) => matchesWhere(row, c))) return false;
      continue;
    }
    if (key === 'OR') {
      const clauses = condition as Record<string, unknown>[];
      if (!clauses.some((c) => matchesWhere(row, c))) return false;
      continue;
    }
    if (key === 'NOT') {
      if (matchesWhere(row, condition as Record<string, unknown>)) return false;
      continue;
    }

    const rowKey = normalizeKey(key, row);
    const val = row[rowKey];

    if (condition === null || typeof condition !== 'object') {
      if (val != condition) return false;
      continue;
    }

    const cond = condition as Record<string, unknown>;
    if ('equals' in cond && val != cond.equals) return false;
    if ('not' in cond && val == cond.not) return false;
    if ('gt' in cond && !(Number(val) > Number(cond.gt))) return false;
    if ('gte' in cond && !(Number(val) >= Number(cond.gte))) return false;
    if ('lt' in cond && !(Number(val) < Number(cond.lt))) return false;
    if ('lte' in cond && !(Number(val) <= Number(cond.lte))) return false;
    if ('contains' in cond && !String(val).toLowerCase().includes(String(cond.contains).toLowerCase())) return false;
    if ('startsWith' in cond && !String(val).toLowerCase().startsWith(String(cond.startsWith).toLowerCase())) return false;
    if ('endsWith' in cond && !String(val).toLowerCase().endsWith(String(cond.endsWith).toLowerCase())) return false;
    if ('in' in cond && !(cond.in as unknown[]).includes(val)) return false;
    if ('notIn' in cond && (cond.notIn as unknown[]).includes(val)) return false;
  }
  return true;
}

function applySelect(row: Record<string, unknown>, select: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(select)) {
    if (val === true) {
      const rowKey = normalizeKey(key, row);
      out[key] = row[rowKey];
    }
  }
  return out;
}

function applyOrderBy(rows: Record<string, unknown>[], orderBy: unknown): Record<string, unknown>[] {
  const orders = Array.isArray(orderBy) ? orderBy : [orderBy];
  return [...rows].sort((a, b) => {
    for (const ord of orders) {
      for (const [key, dir] of Object.entries(ord as Record<string, unknown>)) {
        const rowKey = normalizeKey(key, a);
        const av = a[rowKey];
        const bv = b[rowKey];
        const cmp = av === bv ? 0 : av! < bv! ? -1 : 1;
        if (cmp !== 0) return dir === 'desc' ? -cmp : cmp;
      }
    }
    return 0;
  });
}

function modelToTable(model: string): string {
  // User → users, Order → orders, ProductCategory → product_categories
  return camelToSnake(model).toLowerCase() + (model.endsWith('s') ? '' : 's');
}

function execute(
  model: string,
  method: string,
  args: Record<string, unknown>,
  dataset: Dataset
): unknown {
  const tableName = modelToTable(model);
  const tableData = dataset.tables[tableName] ?? dataset.tables[model.toLowerCase()] ?? [];

  const where = (args.where as Record<string, unknown>) ?? {};
  const select = args.select as Record<string, unknown> | undefined;
  const orderBy = args.orderBy;
  const take = args.take as number | undefined;
  const skip = args.skip as number | undefined;

  let rows = [...tableData];
  if (Object.keys(where).length) rows = rows.filter((r) => matchesWhere(r, where));
  if (orderBy) rows = applyOrderBy(rows, orderBy);
  if (skip !== undefined) rows = rows.slice(skip);
  if (take !== undefined) rows = rows.slice(0, take);
  if (select) rows = rows.map((r) => applySelect(r, select));

  if (method === 'findMany') return rows;
  if (method === 'findFirst') return rows[0] ?? null;
  if (method === 'findUnique') return rows[0] ?? null;
  if (method === 'count') return rows.length;

  if (method === 'create') {
    const data = args.data as Record<string, unknown>;
    return data;
  }
  if (method === 'update') {
    const data = args.data as Record<string, unknown>;
    if (rows[0]) return { ...rows[0], ...data };
    return null;
  }
  if (method === 'delete') {
    return rows[0] ?? null;
  }

  throw new Error(`Unsupported method: ${method}`);
}

export function runPrisma(query: string, dataset: Dataset): QueryResult {
  const start = performance.now();
  try {
    const tokens = tokenize(query.trim());
    const parser = new Parser(tokens);
    const { model, method, args } = parser.parsePrismaCall();
    const result = execute(model, method, args, dataset);
    const executionMs = Math.round(performance.now() - start);

    if (method === 'count') {
      return {
        status: 'success',
        rows: [{ count: result as number }],
        columns: ['count'],
        rowCount: 1,
        executionMs,
      };
    }

    if (result === null) {
      return { status: 'success', rows: [], columns: [], rowCount: 0, executionMs };
    }

    const rows = Array.isArray(result)
      ? (result as Record<string, unknown>[])
      : [result as Record<string, unknown>];
    const columns = rows.length ? Object.keys(rows[0]) : [];
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
