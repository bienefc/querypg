'use client';
import { use, useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import { QueryEditor } from '@/components/editor/QueryEditor';
import { ResultsTable } from '@/components/results/ResultsTable';
import { QuizFeedback } from '@/components/quiz/QuizFeedback';
import { useQuizStore } from '@/store/quizStore';
import { getQuizBySlug } from '@/data/quizzes';
import { loadDataset } from '@/lib/datasets/loader';
import { executeQuery } from '@/lib/engines';
import { evaluate } from '@/lib/quiz/evaluator';
import { Dataset, EvaluationFeedback, QueryResult } from '@/types';
import { cn } from '@/lib/utils/cn';

const DIFFICULTY_COLOR = {
  easy:   'text-green-400 border-green-700/50',
  medium: 'text-yellow-400 border-yellow-700/50',
  hard:   'text-red-400 border-red-700/50',
};

const TYPE_COLOR: Record<string, string> = {
  sql:        'text-blue-400',
  postgresql: 'text-cyan-400',
  prisma:     'text-purple-400',
  mongodb:    'text-green-400',
};

export default function QuizQuestionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const quizData = getQuizBySlug(slug);
  if (!quizData) notFound();
  const quiz = quizData!;

  const [query, setQuery] = useState(quiz.starterCode);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<EvaluationFeedback | null>(null);
  const [actualResult, setActualResult] = useState<QueryResult | null>(null);
  const [hintIndex, setHintIndex] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [showExpected, setShowExpected] = useState(false);

  const { addAttempt, completedIds } = useQuizStore();
  const isCompleted = completedIds.includes(quiz.id);

  useEffect(() => {
    loadDataset(quiz.datasetId).then(setDataset).catch(console.error);
  }, [quiz.datasetId]);

  async function handleSubmit() {
    if (!dataset || isSubmitting) return;
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const result = await executeQuery(query, quiz.queryType, dataset);
      setActualResult(result);
      const fb = evaluate(quiz.expectedOutput, result, {
        orderSensitive: quiz.orderSensitive,
        ignoreColumnOrder: quiz.ignoreColumnOrder ?? true,
      });
      setFeedback(fb);
      addAttempt({
        questionId: quiz.id,
        submittedQuery: query,
        actualOutput: result,
        passed: fb.passed,
        feedback: fb,
        submittedAt: Date.now(),
        hintsUsed: hintIndex,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleNextHint() {
    setShowHint(true);
    setHintIndex((i) => Math.min(i + 1, quiz.hints.length));
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6 overflow-y-auto flex-1 w-full scrollbar-hide">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/quiz" className="hover:text-slate-300 transition-colors">Quiz</Link>
        <span>/</span>
        <span className="text-slate-300">{quiz.title}</span>
      </div>

      {/* Title row */}
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('text-xs font-semibold uppercase', TYPE_COLOR[quiz.queryType])}>
              {quiz.queryType}
            </span>
            <span className={cn('text-xs px-2 py-0.5 rounded border', DIFFICULTY_COLOR[quiz.difficulty])}>
              {quiz.difficulty}
            </span>
            {isCompleted && <span className="text-green-400 text-xs">✓ Completed</span>}
          </div>
          <h1 className="text-xl font-bold text-white">{quiz.title}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: problem + editor */}
        <div className="lg:col-span-3 space-y-4">
          {/* Problem description */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="prose prose-sm prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{quiz.description}</ReactMarkdown>
            </div>
          </div>

          {/* Editor */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-800 text-xs text-slate-500 flex items-center justify-between">
              <span>Your query</span>
              <button
                onClick={() => setQuery(quiz.starterCode)}
                className="text-slate-600 hover:text-slate-400 text-xs transition-colors"
              >
                Reset
              </button>
            </div>
            <div style={{ height: 200 }}>
              <QueryEditor value={query} onChange={setQuery} queryType={quiz.queryType} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !dataset}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Checking…
                </>
              ) : (
                'Submit Answer'
              )}
            </button>

            {quiz.hints.length > 0 && hintIndex < quiz.hints.length && (
              <button
                onClick={handleNextHint}
                className="px-4 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 text-sm transition-colors"
              >
                💡 Hint {hintIndex + 1}/{quiz.hints.length}
              </button>
            )}
          </div>

          {/* Hint */}
          {showHint && hintIndex > 0 && (
            <div className="bg-yellow-950/30 border border-yellow-800/40 rounded-lg p-3 text-sm text-yellow-200">
              💡 {quiz.hints[hintIndex - 1]}
            </div>
          )}

          {/* Feedback */}
          {feedback && actualResult && (
            <QuizFeedback
              feedback={feedback}
              expected={quiz.expectedOutput}
              actual={actualResult}
              explanation={quiz.explanation}
            />
          )}
        </div>

        {/* Right: expected output */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowExpected((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-slate-300 hover:bg-slate-800/40 transition-colors"
            >
              <span className="font-medium">Expected Output</span>
              <span className="text-slate-600">{showExpected ? '▲' : '▼'}</span>
            </button>
            {showExpected && (
              <div className="max-h-64 overflow-hidden border-t border-slate-800">
                <ResultsTable result={quiz.expectedOutput} />
              </div>
            )}
            {!showExpected && (
              <div className="px-4 pb-3 text-xs text-slate-600">
                {quiz.expectedOutput.rowCount} row{quiz.expectedOutput.rowCount !== 1 ? 's' : ''} expected ·{' '}
                {quiz.expectedOutput.columns.join(', ')}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {quiz.tags.map((tag) => (
              <span key={tag} className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
