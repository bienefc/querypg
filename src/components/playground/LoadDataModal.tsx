'use client';
import { useRef, useState, useEffect } from 'react';
import { usePlaygroundStore } from '@/store/playgroundStore';
import { parseCSV, parseJSON } from '@/lib/utils/parseData';
import { cn } from '@/lib/utils/cn';

interface Props {
  onClose: () => void;
}

type Format = 'json' | 'csv';

export function LoadDataModal({ onClose }: Props) {
  const [tableName, setTableName] = useState('');
  const [format, setFormat] = useState<Format>('json');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{ columns: string[]; rows: Record<string, unknown>[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { addCustomTable, datasets } = usePlaygroundStore();

  const customDataset = datasets.find((d) => d.id === 'custom');
  const existingTables = customDataset?.schema.map((s) => s.name) ?? [];

  // Auto-parse whenever text or format changes
  useEffect(() => {
    if (!text.trim()) { setPreview(null); setError(''); return; }
    const result = format === 'json' ? parseJSON(text) : parseCSV(text);
    if (result.error) { setError(result.error); setPreview(null); return; }
    if (!result.rows.length) { setError('No rows found.'); setPreview(null); return; }
    setError('');
    setPreview({ columns: result.columns, rows: result.rows });
  }, [text, format]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    const detectedFormat: Format = ext === 'csv' ? 'csv' : 'json';
    setFormat(detectedFormat);
    if (!tableName) setTableName(file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_'));
    const reader = new FileReader();
    reader.onload = (ev) => setText(ev.target?.result as string ?? '');
    reader.readAsText(file);
    // reset input so same file can be re-uploaded
    e.target.value = '';
  }

  function handleLoad() {
    if (!preview) return;
    const name = tableName.trim() || 'table1';
    addCustomTable(name, preview.rows);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
          <div>
            <h2 className="font-semibold text-white text-base">Load Custom Data</h2>
            <p className="text-xs text-slate-500 mt-0.5">Upload or paste a JSON array / CSV — preview appears instantly.</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xl leading-none transition-colors">✕</button>
        </div>

        <div className="overflow-y-auto scrollbar-hide flex-1 p-5 space-y-4">

          {/* Existing tables */}
          {existingTables.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wider">Loaded tables</p>
              <div className="flex flex-wrap gap-2">
                {existingTables.map((t) => (
                  <span key={t} className="flex items-center gap-1.5 text-xs bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-1 rounded-full">
                    {t}
                    <button
                      onClick={() => usePlaygroundStore.getState().removeCustomTable(t)}
                      className="text-slate-500 hover:text-red-400 transition-colors leading-none"
                    >✕</button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Table name */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Table name</label>
            <input
              value={tableName}
              onChange={(e) => setTableName(e.target.value.replace(/[^a-zA-Z0-9_]/g, '_'))}
              placeholder="my_table"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-slate-500"
            />
          </div>

          {/* Format toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Format:</span>
            <div className="flex gap-1 p-0.5 bg-slate-800 rounded-lg">
              {(['json', 'csv'] as Format[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={cn(
                    'px-3 py-1 rounded-md text-xs font-medium transition-colors uppercase',
                    format === f ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* File upload */}
          <div>
            <input ref={fileRef} type="file" accept=".json,.csv" className="hidden" onChange={handleFile} />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full border border-dashed border-slate-700 hover:border-slate-500 rounded-lg py-3 text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              ↑ Click to upload a .json or .csv file
            </button>
          </div>

          {/* Paste area */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">
              {format === 'json' ? 'Or paste a JSON array' : 'Or paste CSV (with header row)'}
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={format === 'json'
                ? '[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}]'
                : 'id,name,age\n1,Alice,30\n2,Bob,25'}
              rows={6}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-slate-500 resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="text-sm text-red-400 bg-red-950/40 border border-red-800/40 rounded-lg p-3">
              {error}
            </div>
          )}

          {/* Auto preview */}
          {preview && (
            <div className="border border-slate-700 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-slate-800 text-xs text-slate-400 flex items-center justify-between">
                <span>{preview.rows.length} rows · {preview.columns.length} columns</span>
                <span className="text-green-400">✓ Ready to load</span>
              </div>
              <div className="overflow-x-auto max-h-40 scrollbar-hide">
                <table className="w-full text-xs">
                  <thead className="bg-slate-900">
                    <tr>
                      {preview.columns.map((c) => (
                        <th key={c} className="px-3 py-1.5 text-left text-slate-400 border-b border-slate-800 whitespace-nowrap">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-b border-slate-800">
                        {preview.columns.map((c) => (
                          <td key={c} className="px-3 py-1.5 text-slate-300 font-mono whitespace-nowrap">
                            {row[c] === null ? <span className="text-slate-600 italic">NULL</span> : String(row[c])}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {preview.rows.length > 5 && (
                      <tr>
                        <td colSpan={preview.columns.length} className="px-3 py-1.5 text-slate-600 text-center italic">
                          …and {preview.rows.length - 5} more rows
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-800 shrink-0">
          <p className="text-xs text-slate-600">
            Then query with <code className="text-slate-500">SELECT * FROM {tableName || 'your_table'}</code>
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">Cancel</button>
            <button
              onClick={handleLoad}
              disabled={!preview}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
            >
              Load table
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
