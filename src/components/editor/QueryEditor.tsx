'use client';
import dynamic from 'next/dynamic';
import { QueryType } from '@/types';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface Props {
  value: string;
  onChange: (val: string) => void;
  queryType: QueryType;
  readOnly?: boolean;
  height?: string;
}

const LANGUAGE_MAP: Record<QueryType, string> = {
  sql: 'sql',
  postgresql: 'sql',
  prisma: 'javascript',
  mongodb: 'javascript',
};

export function QueryEditor({ value, onChange, queryType, readOnly = false, height = '100%' }: Props) {
  return (
    <MonacoEditor
      height={height}
      language={LANGUAGE_MAP[queryType]}
      value={value}
      theme="vs-dark"
      onChange={(v) => onChange(v ?? '')}
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        tabSize: 2,
        automaticLayout: true,
        padding: { top: 12 },
      }}
    />
  );
}
