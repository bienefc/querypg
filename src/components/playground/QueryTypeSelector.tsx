'use client';
import { QueryType } from '@/types';
import { cn } from '@/lib/utils/cn';

const TYPES: { value: QueryType; label: string; color: string }[] = [
  { value: 'sql',        label: 'SQL',        color: 'text-blue-400' },
  { value: 'postgresql', label: 'PostgreSQL',  color: 'text-cyan-400' },
  { value: 'prisma',     label: 'Prisma ORM',  color: 'text-purple-400' },
  { value: 'mongodb',    label: 'MongoDB',     color: 'text-green-400' },
];

interface Props {
  value: QueryType;
  onChange: (t: QueryType) => void;
}

export function QueryTypeSelector({ value, onChange }: Props) {
  return (
    <div className="flex gap-1 p-1 bg-slate-800 rounded-lg">
      {TYPES.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
            value === t.value
              ? 'bg-slate-700 text-white shadow'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
          )}
        >
          <span className={value === t.value ? t.color : ''}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}
