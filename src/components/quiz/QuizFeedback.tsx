'use client';
import { EvaluationFeedback, QueryResult } from '@/types';
import { ResultsTable } from '@/components/results/ResultsTable';
import { cn } from '@/lib/utils/cn';

interface Props {
  feedback: EvaluationFeedback;
  expected: QueryResult;
  actual: QueryResult;
  explanation?: string;
}

export function QuizFeedback({ feedback, expected, actual, explanation }: Props) {
  const diffMap: Record<number, string[]> = {};
  for (const m of feedback.mismatchedRows) {
    diffMap[m.rowIndex] = m.diffFields;
  }

  return (
    <div className="space-y-4">
      {/* Banner */}
      <div className={cn(
        'flex items-start gap-3 p-4 rounded-xl border',
        feedback.passed
          ? 'bg-green-950/40 border-green-700/50 text-green-300'
          : 'bg-red-950/40 border-red-700/50 text-red-300'
      )}>
        <span className="text-2xl shrink-0">{feedback.passed ? '✅' : '❌'}</span>
        <div>
          <p className="font-semibold text-sm">{feedback.passed ? 'Correct!' : 'Not quite'}</p>
          <p className="text-sm mt-0.5 opacity-90">{feedback.message}</p>
          {feedback.passed && explanation && (
            <p className="text-sm mt-2 text-green-200/80">{explanation}</p>
          )}
        </div>
      </div>

      {/* Check details */}
      {!feedback.passed && (
        <div className="flex gap-3 text-xs">
          {[
            { label: 'Columns',   ok: feedback.columnsMatch },
            { label: 'Row count', ok: feedback.rowCountMatch },
            { label: 'Data',      ok: feedback.dataMatch },
          ].map((c) => (
            <span
              key={c.label}
              className={cn(
                'px-2 py-1 rounded border',
                c.ok
                  ? 'text-green-400 border-green-800 bg-green-950/30'
                  : 'text-red-400 border-red-800 bg-red-950/30'
              )}
            >
              {c.ok ? '✓' : '✗'} {c.label}
            </span>
          ))}
        </div>
      )}

      {/* Result diff */}
      {!feedback.passed && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-slate-500 mb-1 font-medium">Expected</div>
            <div className="border border-slate-800 rounded-lg overflow-hidden max-h-52">
              <ResultsTable result={expected} />
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1 font-medium">Your output</div>
            <div className="border border-slate-800 rounded-lg overflow-hidden max-h-52">
              <ResultsTable result={actual} diffFields={diffMap} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
