import { Dataset, QueryResult, QueryType } from '@/types';
import { runSql } from './sqlEngine';
import { runMongo } from './mongoEngine';
import { runPrisma } from './prismaEngine';

export async function executeQuery(
  query: string,
  type: QueryType,
  dataset: Dataset
): Promise<QueryResult> {
  if (!query.trim()) {
    return { status: 'error', rows: [], columns: [], rowCount: 0, executionMs: 0, error: 'Query is empty.' };
  }
  switch (type) {
    case 'sql':
      return runSql(query, dataset, 'sql');
    case 'postgresql':
      return runSql(query, dataset, 'postgresql');
    case 'mongodb':
      return runMongo(query, dataset);
    case 'prisma':
      return runPrisma(query, dataset);
  }
}
