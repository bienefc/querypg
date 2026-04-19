import { Dataset, QueryResult } from '@/types';

async function getContext() {
  const { Context } = await import('mingo');
  const accumOps = await import('mingo/operators/accumulator');
  const pipeOps  = await import('mingo/operators/pipeline');
  const queryOps = await import('mingo/operators/query');
  const exprOps  = await import('mingo/operators/expression');

  return Context.init()
    .addAccumulatorOps(accumOps as never)
    .addPipelineOps(pipeOps as never)
    .addQueryOps(queryOps as never)
    .addExpressionOps(exprOps as never);
}

let _ctx: Awaited<ReturnType<typeof getContext>> | null = null;

async function ctx() {
  if (_ctx) return _ctx;
  _ctx = await getContext();
  return _ctx;
}

export async function runMongo(query: string, dataset: Dataset): Promise<QueryResult> {
  const start = performance.now();
  try {
    const context = await ctx();
    const { Aggregator, Query } = await import('mingo');
    const trimmed = query.trim();

    // Mode 1: aggregation pipeline array  [{ $match: ... }, ...]
    if (trimmed.replace(/\/\/[^\n]*/g, '').trimStart().startsWith('[')) {
      const collMatch = trimmed.match(/\/\/\s*collection:\s*(\w+)/);
      const collectionName = collMatch ? collMatch[1] : Object.keys(dataset.tables)[0];
      const collection = dataset.tables[collectionName];
      if (!collection) return errorResult(`Collection "${collectionName}" not found`, start);

      const pipelineJson = trimmed.replace(/\/\/[^\n]*/g, '');
      const pipeline = JSON.parse(pipelineJson);
      const agg = new Aggregator(pipeline, { context });
      const rows = agg.run(collection) as Record<string, unknown>[];
      return toResult(rows, start);
    }

    // Mode 2: db.collection.aggregate([...])
    const aggMatch = trimmed.match(/db\.(\w+)\.aggregate\s*\((\[[\s\S]*\])\s*\)/s);
    if (aggMatch) {
      const [, collName, pipelineStr] = aggMatch;
      const collection = dataset.tables[collName];
      if (!collection) return errorResult(`Collection "${collName}" not found`, start);
      const pipeline = JSON.parse(pipelineStr);
      const agg = new Aggregator(pipeline, { context });
      const rows = agg.run(collection) as Record<string, unknown>[];
      return toResult(rows, start);
    }

    // Mode 3: db.collection.find({ filter }, { projection })
    const findMatch = trimmed.match(/db\.(\w+)\.find\s*\(([^)]*)\)/s);
    if (findMatch) {
      const [, collName, argsStr] = findMatch;
      const collection = dataset.tables[collName];
      if (!collection) return errorResult(`Collection "${collName}" not found`, start);

      let filterObj: Record<string, unknown> = {};
      let projObj: Record<string, unknown> | undefined;

      const args = argsStr.trim();
      if (args) {
        let depth = 0;
        let boundary = -1;
        for (let i = 0; i < args.length; i++) {
          if (args[i] === '{') depth++;
          if (args[i] === '}') { depth--; if (depth === 0) { boundary = i + 1; break; } }
        }
        filterObj = JSON.parse(args.slice(0, boundary).trim() || '{}');
        const rest = args.slice(boundary).replace(/^\s*,\s*/, '').trim();
        if (rest) projObj = JSON.parse(rest);
      }

      const q = new Query(filterObj, { context });
      let cursor = q.find(collection);

      const sortMatch = trimmed.match(/\.sort\s*\((\{[^)]*\})\)/);
      const limitMatch = trimmed.match(/\.limit\s*\((\d+)\)/);
      const skipMatch  = trimmed.match(/\.skip\s*\((\d+)\)/);
      if (sortMatch)  cursor = cursor.sort(JSON.parse(sortMatch[1]));
      if (skipMatch)  cursor = cursor.skip(Number(skipMatch[1]));
      if (limitMatch) cursor = cursor.limit(Number(limitMatch[1]));

      let rows = cursor.all() as Record<string, unknown>[];

      if (projObj) {
        const includes = Object.entries(projObj).filter(([, v]) => v === 1).map(([k]) => k);
        const excludes = Object.entries(projObj).filter(([, v]) => v === 0).map(([k]) => k);
        if (includes.length) {
          rows = rows.map((r) => {
            const out: Record<string, unknown> = {};
            for (const k of includes) out[k] = r[k];
            return out;
          });
        } else if (excludes.length) {
          rows = rows.map((r) => {
            const out = { ...r };
            for (const k of excludes) delete out[k];
            return out;
          });
        }
      }

      return toResult(rows, start);
    }

    return errorResult(
      'Unrecognized format. Use db.collection.find({}) or db.collection.aggregate([...]) or a pipeline array.',
      start
    );
  } catch (err) {
    return errorResult(err instanceof Error ? err.message : String(err), start);
  }
}

function toResult(rows: Record<string, unknown>[], start: number): QueryResult {
  const columns = rows.length ? Object.keys(rows[0]) : [];
  return { status: 'success', rows, columns, rowCount: rows.length, executionMs: Math.round(performance.now() - start) };
}

function errorResult(error: string, start: number): QueryResult {
  return { status: 'error', rows: [], columns: [], rowCount: 0, executionMs: Math.round(performance.now() - start), error };
}
