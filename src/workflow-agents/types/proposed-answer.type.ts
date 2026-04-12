import z from 'zod';

export const proposedAnswerSchema = z.object({
  proposedAnswer: z.string(),
});

export type ProposedAnswer = z.infer<typeof proposedAnswerSchema>;
