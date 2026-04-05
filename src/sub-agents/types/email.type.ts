import { InvocationContext } from '@google/adk';

export type SmtpConfig = {
  host: string;
  port: number;
  user?: string;
  pass?: string;
  from: string;
  email: string;
};

export type EmailStatusOptions = {
  author: string;
  context: InvocationContext;
  status: 'success' | 'error';
  recommendationText: string;
};
