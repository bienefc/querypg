export type QueryType = 'sql' | 'postgresql' | 'prisma' | 'mongodb';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface ColumnSchema {
  name: string;
  type: 'text' | 'integer' | 'real' | 'boolean' | 'date';
}

export interface TableSchema {
  name: string;
  columns: ColumnSchema[];
  rowCount: number;
}

export interface Dataset {
  id: string;
  label: string;
  tables: Record<string, Record<string, unknown>[]>;
  schema: TableSchema[];
}

export interface QueryResult {
  status: 'success' | 'error';
  rows: Record<string, unknown>[];
  columns: string[];
  rowCount: number;
  executionMs: number;
  error?: string;
  errorLine?: number;
}

export interface MismatchedRow {
  rowIndex: number;
  expected: Record<string, unknown>;
  actual: Record<string, unknown>;
  diffFields: string[];
}

export interface EvaluationFeedback {
  passed: boolean;
  rowCountMatch: boolean;
  columnsMatch: boolean;
  dataMatch: boolean;
  orderMatch: boolean;
  mismatchedRows: MismatchedRow[];
  message: string;
}

export interface QuizQuestion {
  id: string;
  slug: string;
  title: string;
  description: string;
  queryType: QueryType;
  datasetId: string;
  difficulty: Difficulty;
  tags: string[];
  starterCode: string;
  solutionQuery: string;
  expectedOutput: QueryResult;
  hints: string[];
  explanation: string;
  orderSensitive?: boolean;
  ignoreColumnOrder?: boolean;
}

export interface QuizAttempt {
  questionId: string;
  submittedQuery: string;
  actualOutput: QueryResult;
  passed: boolean;
  feedback: EvaluationFeedback;
  submittedAt: number;
  hintsUsed: number;
}

export interface EvalOptions {
  orderSensitive: boolean;
  ignoreColumnOrder: boolean;
  caseSensitive: boolean;
}
