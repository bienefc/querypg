'use client';
import { QueryResult } from '@/types';
import { cn } from '@/lib/utils/cn';

interface Props {
  result: QueryResult;
  diffFields?: Record<number, string[]>;
}

export function ResultsTable({ result, diffFields }: Props) {
  if (result.status === 'error') {
    return (
      <div className="p-4 bg-red-950 border border-red-700 rounded-lg text-red-300 font-mono text-sm whitespace-pre-wrap">
        <span className="font-bold text-red-400">Error: </span>{result.error}
      </div>
    );
  }

  if (!result.rows.length) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm">
        Query executed successfully — 0 rows returned.
        <span className="ml-2 text-slate-600">({result.executionMs}ms)</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="text-xs text-slate-500 px-3 py-1.5 border-b border-slate-800 shrink-0">
        {result.rowCount} row{result.rowCount !== 1 ? 's' : ''} · {result.executionMs}ms
      </div>
      <div className="overflow-auto flex-1">
        <table className="w-full text-sm text-left">
          <thead className="sticky top-0 bg-slate-900 z-10">
            <tr>
              {result.columns.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2 font-medium text-slate-300 border-b border-r border-slate-700 whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={cn(
                  'border-b border-slate-800 hover:bg-slate-800/40',
                  diffFields?.[rowIdx]?.length && 'bg-amber-950/30'
                )}
              >
                {result.columns.map((col) => {
                  const isDiff = diffFields?.[rowIdx]?.includes(col);
                  return (
                    <td
                      key={col}
                      className={cn(
                        'px-3 py-1.5 text-slate-200 border-r border-slate-800 font-mono text-xs whitespace-nowrap max-w-xs truncate',
                        isDiff && 'bg-amber-500/20 text-amber-200'
                      )}
                      title={String(row[col] ?? 'NULL')}
                    >
                      {row[col] === null || row[col] === undefined ? (
                        <span className="text-slate-600 italic">NULL</span>
                      ) : (
                        String(row[col])
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
