'use client';
import Link from 'next/link';
import { QuizQuestion } from '@/types';
import { cn } from '@/lib/utils/cn';

const DIFFICULTY_COLOR = {
  easy:   'text-green-400 bg-green-400/10 border-green-400/30',
  medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  hard:   'text-red-400 bg-red-400/10 border-red-400/30',
};

const TYPE_COLOR: Record<string, string> = {
  sql:        'text-blue-400',
  postgresql: 'text-cyan-400',
  prisma:     'text-purple-400',
  mongodb:    'text-green-400',
};

interface Props {
  quiz: QuizQuestion;
  completed?: boolean;
}

export function QuizCard({ quiz, completed }: Props) {
  return (
    <Link
      href={`/quiz/${quiz.slug}`}
      className={cn(
        'block p-4 rounded-xl border transition-all hover:border-slate-600 hover:bg-slate-800/60',
        completed ? 'border-green-800/60 bg-green-950/20' : 'border-slate-800 bg-slate-900'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-medium text-slate-200 text-sm leading-snug">{quiz.title}</h3>
        {completed && <span className="text-green-400 text-xs shrink-0">✓ Done</span>}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={cn('text-xs font-medium', TYPE_COLOR[quiz.queryType])}>
          {quiz.queryType.toUpperCase()}
        </span>
        <span className={cn('text-xs px-2 py-0.5 rounded border', DIFFICULTY_COLOR[quiz.difficulty])}>
          {quiz.difficulty}
        </span>
        {quiz.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
            {tag}
          </span>
        ))}
      </div>
    </Link>
  );
}
