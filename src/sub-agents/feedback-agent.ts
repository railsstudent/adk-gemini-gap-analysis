import { FunctionTool, LlmAgent, SingleBeforeModelCallback } from '@google/adk';
import { validateFeedback } from './agent-utils/feedback.util.js';
import { validateByScore } from './agent-utils/gaps-grades.util.js';
import { createAfterToolCallback } from '../callbacks/after-tool-retry-callback.js';
import { createAgentEndCallback, createAgentStartCallback } from '../callbacks/performance-callback.js';
import { resetSessionStateCallback } from '../callbacks/reset-attempts-callback.js';
import { FEEDBACK_KEY } from './output-keys.const.js';
import { generateFeedbackPrompt } from './prompts/feedback.prompt.js';
import { feedbackSchema } from './types/audit-feedback.type.js';
import { generateFaileStateKey, getAuditFeedbackContext } from './utils.js';

const failedStateKey = generateFaileStateKey(FEEDBACK_KEY);

const feedbackAfterToolCallback = createAfterToolCallback(
  `STOP processing immediately and output the final JSON schema. You cannot have both blank strengths and areasForImprovement.`,
  FEEDBACK_KEY,
);

export const validFeedbackTool = new FunctionTool({
  name: 'validate_feedback',
  description:
    'Validates the LLM-generated feedback report to ensure it contains at least one section (strengths or areas for improvement) and uses the correct Markdown headings.',
  parameters: feedbackSchema,
  execute: async (feedback) => {
    const validationResult = validateFeedback(feedback);
    if (validationResult) {
      return validationResult;
    }

    return {
      status: 'SUCCESS',
      finalizedData: feedback,
      message: `Feedback is valid. You MUST now generate the final output schema EXACTLY matching the following JSON. Do NOT change any headings, content, or formatting:\n\n${JSON.stringify(feedback)}\n\nOutput this exact JSON structure to complete your task.`,
    };
  },
});

const checkFeedbackCallback: SingleBeforeModelCallback = async ({ context }) => {
  console.log(`beforeModelCallback: Agent ${context.agentName} validated feedback before calling LLM.`);

  if (context?.state?.get(failedStateKey)) {
    console.log('Validation permanently failed. Terminating agent with fallback data.');
    return {
      content: {
        role: 'model',
        parts: [
          {
            text: JSON.stringify(null),
          },
        ],
      },
    };
  }

  const { feedback } = getAuditFeedbackContext(context);

  if (feedback && !validateFeedback(feedback)) {
    return {
      content: {
        role: 'model',
        parts: [
          {
            text: JSON.stringify(feedback),
          },
        ],
      },
    };
  }

  return undefined;
};

export function createFeedbackAgent(model: string) {
  const agentName = 'FeedbackAgent';
  return new LlmAgent({
    name: agentName,
    model,
    description:
      "Synthesizes the evaluations of the user's answer against the architectural question into a final feedback report containing strengths and areas for improvement.",
    beforeAgentCallback: [createAgentStartCallback(agentName), resetSessionStateCallback(failedStateKey)],
    beforeModelCallback: checkFeedbackCallback,
    afterToolCallback: feedbackAfterToolCallback,
    afterAgentCallback: createAgentEndCallback(agentName),
    instruction: (context) => {
      const { gapsGrades, question, answer } = getAuditFeedbackContext(context);
      const { evaluations } = gapsGrades || { evaluations: [] };

      const allValidEvaluations = evaluations.every((evaluation) => !validateByScore(evaluation));

      if (allValidEvaluations && question && answer) {
        return generateFeedbackPrompt(question, answer, evaluations);
      }

      return 'Skipping LLM due to invalid evaluations.';
    },
    tools: [validFeedbackTool],
    outputSchema: feedbackSchema,
    outputKey: FEEDBACK_KEY,
    disallowTransferToParent: true,
    disallowTransferToPeers: true,
  });
}
