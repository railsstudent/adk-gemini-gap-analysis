import { z } from 'zod';
import { antiPatternsSchema, decisionSchema, projectSchema } from './evaluation.type.js';

export const auditTrailSchema = z.object({
  project: projectSchema.nullable(),
  status: z.enum(['success', 'error']),
  timestamp: z.string(),
  sessionId: z.string(),
  invocationId: z.string(),
  decision: decisionSchema.nullable(),
  antiPatterns: antiPatternsSchema.nullable(),
});

export type AuditTrail = z.infer<typeof auditTrailSchema>;

export const cloudStorageSchema = z.object({
  uuid: z.string(),
  url: z.string().nullable(),
  status: z.enum(['success', 'error']),
  timestamp: z.string(),
});

export type CloudStorage = z.infer<typeof cloudStorageSchema>;

export const mergerSchema = z.object({
  summary: z.string(),
});

export type Merger = z.infer<typeof mergerSchema>;
