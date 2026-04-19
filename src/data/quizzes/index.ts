import sqlQuizzes from './sql-basics';
import postgresqlQuizzes from './postgresql';
import prismaQuizzes from './prisma-orm';
import mongoQuizzes from './mongodb';
import { QuizQuestion } from '@/types';

export const allQuizzes: QuizQuestion[] = [
  ...sqlQuizzes,
  ...postgresqlQuizzes,
  ...prismaQuizzes,
  ...mongoQuizzes,
];

export function getQuizBySlug(slug: string): QuizQuestion | undefined {
  return allQuizzes.find((q) => q.slug === slug);
}

export function getQuizzesByType(type: string): QuizQuestion[] {
  return allQuizzes.filter((q) => q.queryType === type);
}
