import { BaseAgent, SequentialAgent } from '@google/adk';
import { initSubAgents } from '../init.js';

export function createAuditFeedbackAgent(model: string): BaseAgent[] {
  const sequentialAuditFeedbackAgent = new SequentialAgent({
    name: 'SequentialAuditFeedbackAgent',
    subAgents: initSubAgents(model),
    description: `
            A sequential pipeline that processes a validated audit question and the user's answer. 
            It decomposes the question into sub-questions, evaluates the provided answer against these criteria, and generates a finalized, merged JSON report.
        `,
  });

  return [sequentialAuditFeedbackAgent];
}
