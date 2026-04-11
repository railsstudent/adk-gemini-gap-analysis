import z from 'zod';

export const refineAnswerSchema = z.object({
  question: z.string(),
  refinedAnswer: z.string(),
});

export type RefineAnswer = z.infer<typeof refineAnswerSchema>;
