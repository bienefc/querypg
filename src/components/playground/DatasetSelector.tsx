'use client';
import { Dataset } from '@/types';

interface Props {
  datasets: Dataset[];
  value: string;
  onChange: (id: string) => void;
}

export function DatasetSelector({ datasets, value, onChange }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-slate-500"
    >
      {datasets.map((d) => (
        <option key={d.id} value={d.id}>
          {d.label}
        </option>
      ))}
    </select>
  );
}
