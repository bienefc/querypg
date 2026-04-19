'use client';
import { useState } from 'react';
import { QuizCard } from '@/components/quiz/QuizCard';
import { useQuizStore } from '@/store/quizStore';
import { allQuizzes } from '@/data/quizzes';
import { QueryType } from '@/types';
import { cn } from '@/lib/utils/cn';

const TYPES: { value: QueryType | 'all'; label: string; color: string }[] = [
  { value: 'all',        label: 'All',        color: 'text-slate-300' },
  { value: 'sql',        label: 'SQL',        color: 'text-blue-400' },
  { value: 'postgresql', label: 'PostgreSQL',  color: 'text-cyan-400' },
  { value: 'prisma',     label: 'Prisma ORM',  color: 'text-purple-400' },
  { value: 'mongodb',    label: 'MongoDB',     color: 'text-green-400' },
];

export default function QuizPage() {
  const [filter, setFilter] = useState<QueryType | 'all'>('all');
  const { completedIds } = useQuizStore();

  const filtered = filter === 'all' ? allQuizzes : allQuizzes.filter((q) => q.queryType === filter);
  const completed = completedIds.length;
  const total = allQuizzes.length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 overflow-y-auto flex-1 scrollbar-hide">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Query Quiz</h1>
        <p className="text-slate-400 text-sm">
          Practice writing queries — submit your answer and see instant feedback.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${total ? (completed / total) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs text-slate-500">{completed}/{total} completed</span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-slate-800/60 rounded-lg mb-6 w-fit">
        {TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setFilter(t.value)}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              filter === t.value
                ? 'bg-slate-700 shadow'
                : 'text-slate-400 hover:text-slate-200'
            )}
          >
            <span className={filter === t.value ? t.color : ''}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Quiz grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((quiz) => (
          <QuizCard
            key={quiz.id}
            quiz={quiz}
            completed={completedIds.includes(quiz.id)}
          />
        ))}
      </div>

      {!filtered.length && (
        <div className="text-center text-slate-600 py-12 text-sm">
          No quizzes for this filter yet.
        </div>
      )}
    </div>
  );
}
