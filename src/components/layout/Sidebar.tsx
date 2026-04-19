'use client';
import { useState } from 'react';
import { Dataset } from '@/types';
import { cn } from '@/lib/utils/cn';

interface Props {
  dataset: Dataset | null;
}

const TYPE_COLOR: Record<string, string> = {
  integer: 'text-blue-400',
  real:    'text-yellow-400',
  text:    'text-green-400',
  boolean: 'text-purple-400',
  date:    'text-orange-400',
};

export function Sidebar({ dataset }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (!dataset) return null;

  return (
    <aside className="w-56 border-l border-slate-800 bg-slate-950 overflow-y-auto shrink-0">
      <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-800">
        Schema
      </div>
      {dataset.schema.map((table) => (
        <div key={table.name}>
          <button
            onClick={() => setExpanded((e) => ({ ...e, [table.name]: !e[table.name] }))}
            className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/60 transition-colors"
          >
            <span className="font-medium">{table.name}</span>
            <span className="text-slate-600 text-xs">{table.rowCount}r</span>
          </button>
          {expanded[table.name] && (
            <div className="pb-1">
              {table.columns.map((col) => (
                <div key={col.name} className="flex items-center gap-2 px-5 py-0.5 text-xs">
                  <span className="text-slate-400">{col.name}</span>
                  <span className={cn('ml-auto', TYPE_COLOR[col.type] ?? 'text-slate-500')}>{col.type}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </aside>
  );
}
