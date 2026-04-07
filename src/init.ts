import { createSubQuestionsAgent } from './sub-agents/sub-questions-agent.js';

export function initSubAgents(model: string) {
  return [
    createSubQuestionsAgent(model),
    // createAnitPatternsAgent(model),
    // createDecisionTreeAgent(model),
    // createRecommendationAgent(model),
    // createAuditAndUploadAgents(),
    // createMergerAgent(model),
    // createEmailAgent(),
  ];
}
