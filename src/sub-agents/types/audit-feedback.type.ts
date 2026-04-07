import { array, z } from 'zod';

export const subQuestionsSchema = z.object({
  texts: z.array(z.string()).default([]),
});

export type SubQuestions = z.infer<typeof subQuestionsSchema>;

export const antiPatternsSchema = z.object({
  isChatbot: z.boolean(),
  isSingleAPI: z.boolean(),
  isHighVolume: z.boolean(),
  isWorkflow: z.boolean(),
  isSafetyCritical: z.boolean(),
});

export type AntiPatterns = z.infer<typeof antiPatternsSchema>;

export const decisionSchema = z.object({
  nodes: array(z.string()).default([]),
  verdict: z.enum(['Use Agent', 'Use Simple API', 'Use Workflow Automation', 'Use LLM', 'None']).default('None'),
});

export type Decision = z.infer<typeof decisionSchema>;
