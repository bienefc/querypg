'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { QuizAttempt } from '@/types';

interface QuizState {
  attempts: Record<string, QuizAttempt[]>;
  completedIds: string[];
  addAttempt: (attempt: QuizAttempt) => void;
  resetQuestion: (questionId: string) => void;
  clearAll: () => void;
}

export const useQuizStore = create<QuizState>()(
  persist(
    (set) => ({
      attempts: {},
      completedIds: [],
      addAttempt: (attempt) =>
        set((s) => {
          const prev = s.attempts[attempt.questionId] ?? [];
          const updated = [attempt, ...prev].slice(0, 10);
          return {
            attempts: { ...s.attempts, [attempt.questionId]: updated },
            completedIds: attempt.passed
              ? Array.from(new Set([...s.completedIds, attempt.questionId]))
              : s.completedIds,
          };
        }),
      resetQuestion: (questionId) =>
        set((s) => ({
          attempts: { ...s.attempts, [questionId]: [] },
          completedIds: s.completedIds.filter((id) => id !== questionId),
        })),
      clearAll: () => set({ attempts: {}, completedIds: [] }),
    }),
    { name: 'quiz-progress' }
  )
);
