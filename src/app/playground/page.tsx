'use client';
import { useEffect, useRef, useState } from 'react';
import { QueryEditor } from '@/components/editor/QueryEditor';
import { ResultsTable } from '@/components/results/ResultsTable';
import { QueryTypeSelector } from '@/components/playground/QueryTypeSelector';
import { DatasetSelector } from '@/components/playground/DatasetSelector';
import { LoadDataModal } from '@/components/playground/LoadDataModal';
import { Sidebar } from '@/components/layout/Sidebar';
import { usePlaygroundStore } from '@/store/playgroundStore';
import { loadAllDatasets } from '@/lib/datasets/loader';
import { executeQuery } from '@/lib/engines';

export default function PlaygroundPage() {
  const {
    queryType, datasetId, query, result, isRunning,
    datasets, setQueryType, setDatasetId, setQuery,
    setResult, setRunning, setDatasets,
  } = usePlaygroundStore();

  const [showLoadModal, setShowLoadModal] = useState(false);
  const currentDataset = datasets.find((d) => d.id === datasetId) ?? null;
  const runRef = useRef(false);

  useEffect(() => {
    loadAllDatasets().then((loaded) => {
      // Preserve any custom dataset already in store
      usePlaygroundStore.setState((s) => ({
        datasets: [
          ...loaded,
          ...s.datasets.filter((d) => d.id === 'custom'),
        ],
      }));
    }).catch(console.error);
  }, [setDatasets]);

  async function handleRun() {
    if (isRunning || !currentDataset) return;
    runRef.current = true;
    setRunning(true);
    try {
      const res = await executeQuery(query, queryType, currentDataset);
      setResult(res);
    } finally {
      setRunning(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRun();
    }
  }

  const hasCustom = datasets.some((d) => d.id === 'custom');

  return (
    <div className="flex flex-col h-full overflow-hidden" onKeyDown={handleKeyDown}>
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-800 bg-slate-950 shrink-0 flex-wrap gap-y-2">
        <QueryTypeSelector value={queryType} onChange={setQueryType} />
        <DatasetSelector datasets={datasets} value={datasetId} onChange={setDatasetId} />

        {/* Load Data button */}
        <button
          onClick={() => setShowLoadModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-slate-200 text-sm transition-colors"
        >
          ↑ Load Data
          {hasCustom && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
        </button>

        <button
          onClick={handleRun}
          disabled={isRunning || !currentDataset}
          className="ml-auto flex items-center gap-2 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
        >
          {isRunning ? (
            <>
              <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Running…
            </>
          ) : (
            <>▶ Run <span className="text-blue-300 text-xs">⌘↵</span></>
          )}
        </button>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor pane */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex-1 min-h-0">
            <QueryEditor value={query} onChange={setQuery} queryType={queryType} />
          </div>

          {/* Results pane */}
          <div className="h-64 border-t border-slate-800 bg-slate-950 overflow-hidden flex flex-col">
            {result ? (
              <ResultsTable result={result} />
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">
                {currentDataset
                  ? 'Press ▶ Run or Ctrl+Enter to execute your query.'
                  : 'Loading datasets…'}
              </div>
            )}
          </div>
        </div>

        {/* Schema sidebar */}
        <Sidebar dataset={currentDataset} />
      </div>

      {showLoadModal && <LoadDataModal onClose={() => setShowLoadModal(false)} />}
    </div>
  );
}
