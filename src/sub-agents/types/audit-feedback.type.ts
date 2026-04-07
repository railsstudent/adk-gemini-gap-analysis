import { array, z } from 'zod';

export const subQuestionsSchema = z.object({
  texts: z.array(z.string()).default([]),
});

export type SubQuestions = z.infer<typeof subQuestionsSchema>;

export const evaluationSchema = z.object({
  subQuestion: z.string(),
  score: z.enum(['Good', 'Moderate', 'Poor']),
  gaps: z.array(z.string()).default([]),
  strengths: z.array(z.string()).default([]),
});

export type Evaluation = z.infer<typeof evaluationSchema>;

export const gapsGradesSchema = z.object({
  evaluations: array(evaluationSchema),
});

export type GapsGrades = z.infer<typeof gapsGradesSchema>;
