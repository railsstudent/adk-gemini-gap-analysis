import { z } from 'zod';

export const recommendationSchema = z.object({
  text: z.string(),
});

export type Recommendation = z.infer<typeof recommendationSchema>;
