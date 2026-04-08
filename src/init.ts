import { createFeedbackAgent } from './sub-agents/feedback-agent.js';
import { createFinalOutputAgent } from './sub-agents/final-output-agent.js';
import { createGapsGradesAgent } from './sub-agents/gaps-grades-agent.js';
import { createSubQuestionsAgent } from './sub-agents/sub-questions-agent.js';

export function initSubAgents(model: string) {
  return [
    createSubQuestionsAgent(model),
    createGapsGradesAgent(model),
    createFeedbackAgent(model),
    createFinalOutputAgent(),
  ];
}
