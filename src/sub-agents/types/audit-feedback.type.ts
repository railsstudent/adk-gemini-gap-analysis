import { array, z } from 'zod';

export const questionAnswerSchema = z.object({
  question: z.string().describe('The validated question from the audit.'),
  answer: z.string().describe("It is the user's answer to the audit question."),
});

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

export const feedbackSchema = z.object({
  strengths: z.string().default(''),
  areasForImprovement: z.string().default(''),
});

export type Feedback = z.infer<typeof feedbackSchema>;

export const auditFeedbackSchema = z.object({
  feedback: feedbackSchema,
  overall_score: z.enum(['Good', 'Moderate', 'Poor']),
});

export type AuditFeedback = z.infer<typeof auditFeedbackSchema>;
