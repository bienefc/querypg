'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Dataset, QueryResult, QueryType, TableSchema } from '@/types';
import { inferType } from '@/lib/utils/parseData';

interface PlaygroundState {
  queryType: QueryType;
  datasetId: string;
  query: string;
  result: QueryResult | null;
  isRunning: boolean;
  datasets: Dataset[];
  // persisted separately — raw table data only
  customTables: Record<string, Record<string, unknown>[]>;
  setQueryType: (t: QueryType) => void;
  setDatasetId: (id: string) => void;
  setQuery: (q: string) => void;
  setResult: (r: QueryResult | null) => void;
  setRunning: (v: boolean) => void;
  setDatasets: (d: Dataset[]) => void;
  addCustomTable: (tableName: string, rows: Record<string, unknown>[]) => void;
  removeCustomTable: (tableName: string) => void;
}

const DEFAULT_QUERIES: Record<QueryType, string> = {
  sql:        `SELECT * FROM users`,
  postgresql: `SELECT name, email FROM users WHERE name ILIKE '%chen%'`,
  prisma:     `prisma.user.findMany()`,
  mongodb:    `db.users.find({})`,
};

const CUSTOM_ID = 'custom';

function buildCustomDataset(tables: Record<string, Record<string, unknown>[]>): Dataset {
  const schema: TableSchema[] = Object.entries(tables).map(([name, rows]) => ({
    name,
    rowCount: rows.length,
    columns: rows.length
      ? Object.keys(rows[0]).map((col) => ({
          name: col,
          type: inferType(rows.map((r) => r[col])),
        }))
      : [],
  }));
  return { id: CUSTOM_ID, label: 'Custom Data', tables, schema };
}

function invalidateSqlCache(id: string) {
  import('@/lib/engines/sqlEngine').then(({ invalidateCache }) => invalidateCache(id));
}

export const usePlaygroundStore = create<PlaygroundState>()(
  persist(
    (set, get) => ({
      queryType: 'sql',
      datasetId: 'ecommerce',
      query: DEFAULT_QUERIES.sql,
      result: null,
      isRunning: false,
      datasets: [],
      customTables: {},

      setQueryType: (queryType) =>
        set((s) => ({
          queryType,
          query: s.queryType !== queryType ? DEFAULT_QUERIES[queryType] : s.query,
          result: null,
        })),
      setDatasetId: (datasetId) => set({ datasetId, result: null }),
      setQuery:    (query)     => set({ query }),
      setResult:   (result)    => set({ result }),
      setRunning:  (isRunning) => set({ isRunning }),

      setDatasets: (loaded) => {
        // Merge loaded built-in datasets with the persisted custom dataset (if any)
        const { customTables } = get();
        const hasCustom = Object.keys(customTables).length > 0;
        set({
          datasets: hasCustom
            ? [...loaded, buildCustomDataset(customTables)]
            : loaded,
        });
      },

      addCustomTable: (tableName, rows) => {
        const { customTables, datasets } = get();
        const newTables = { ...customTables, [tableName]: rows };
        invalidateSqlCache(CUSTOM_ID);
        const newDataset = buildCustomDataset(newTables);
        const hasExisting = datasets.some((d) => d.id === CUSTOM_ID);
        set({
          customTables: newTables,
          datasets: hasExisting
            ? datasets.map((d) => (d.id === CUSTOM_ID ? newDataset : d))
            : [...datasets, newDataset],
          datasetId: CUSTOM_ID,
          result: null,
        });
      },

      removeCustomTable: (tableName) => {
        const { customTables, datasets } = get();
        const newTables = { ...customTables };
        delete newTables[tableName];
        invalidateSqlCache(CUSTOM_ID);
        if (!Object.keys(newTables).length) {
          set({
            customTables: {},
            datasets: datasets.filter((d) => d.id !== CUSTOM_ID),
            datasetId: 'ecommerce',
            result: null,
          });
        } else {
          set({
            customTables: newTables,
            datasets: datasets.map((d) => (d.id === CUSTOM_ID ? buildCustomDataset(newTables) : d)),
            result: null,
          });
        }
      },
    }),
    {
      name: 'playground-custom-data',
      // Only persist the fields that should survive a refresh
      partialize: (s) => ({
        customTables: s.customTables,
        datasetId:    s.datasetId,
        queryType:    s.queryType,
        query:        s.query,
      }),
    }
  )
);
