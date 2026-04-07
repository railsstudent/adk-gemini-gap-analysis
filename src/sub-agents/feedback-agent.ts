import { LlmAgent, SingleBeforeModelCallback } from '@google/adk';
import { createAfterToolCallback } from './callbacks/after-tool-retry-callback.js';
import { createAgentEndCallback, createAgentStartCallback } from './callbacks/performance-callback.js';
import { validateByScore } from './gaps-grades.util.js';
import { FEEDBACK_KEY } from './output-keys.const.js';
import { generateFeedbackPrompt } from './prompts/feedback.prompt.js';
import { Feedback, feedbackSchema } from './types/audit-feedback.type.js';
import { getAuditFeedbackContext } from './utils.js';

const feedbackAfterToolCallback = createAfterToolCallback(
  `STOP processing immediately and output the final JSON schema with a blank strengths and areasForImprovement.`,
);

function isValidFeedback(feedback: Feedback | null) {
  if (!feedback) {
    return false;
  }

  return (
    (feedback.strengths && feedback.strengths.trim().length > 0) ||
    (feedback.areasForImprovement && feedback.areasForImprovement.trim().length > 0)
  );
}

const checkFeedbackCallback: SingleBeforeModelCallback = async ({ context }) => {
  console.log(`beforeModelCallback: Agent ${context.agentName} validated feedback before calling LLM.`);

  const { feedback } = getAuditFeedbackContext(context);

  if (isValidFeedback(feedback)) {
    return {
      content: {
        role: 'model',
        parts: [
          {
            text: JSON.stringify({
              text: feedback,
            }),
          },
        ],
      },
    };
  }

  return undefined;
};

export function createFeedbackAgent(model: string) {
  return new LlmAgent({
    name: 'FeedbackAgent',
    model,
    description:
      'Synthesizes the extracted project components, identified anti-patterns, and decision tree verdict into a comprehensive architectural recommendation report.',
    beforeAgentCallback: createAgentStartCallback('FeedbackAgent'),
    beforeModelCallback: checkFeedbackCallback,
    afterToolCallback: feedbackAfterToolCallback,
    afterAgentCallback: createAgentEndCallback('FeedbackAgent'),
    instruction: (context) => {
      const { gapsGrades } = getAuditFeedbackContext(context);
      const { evaluations } = gapsGrades || { evaluations: [] };

      const allValidEvaluations = evaluations.every((evaluation) => !validateByScore(evaluation));

      if (allValidEvaluations) {
        return generateFeedbackPrompt(evaluations);
      }

      return 'Skipping LLM due to invalid evaluations.';
    },
    outputSchema: feedbackSchema,
    outputKey: FEEDBACK_KEY,
    disallowTransferToParent: true,
    disallowTransferToPeers: true,
  });
}
