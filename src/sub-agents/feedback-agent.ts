import { FunctionTool, LlmAgent, SingleBeforeModelCallback } from '@google/adk';
import { createAfterToolCallback } from './callbacks/after-tool-retry-callback.js';
import { createAgentEndCallback, createAgentStartCallback } from './callbacks/performance-callback.js';
import { validateByScore } from './gaps-grades.util.js';
import { FEEDBACK_KEY } from './output-keys.const.js';
import { generateFeedbackPrompt } from './prompts/feedback.prompt.js';
import { Feedback, feedbackSchema } from './types/audit-feedback.type.js';
import { getAuditFeedbackContext } from './utils.js';

const feedbackAfterToolCallback = createAfterToolCallback(
  `STOP processing immediately and output the final JSON schema. You cannot have both blank strengths and areasForImprovement.`,
);

export const validFeedbackTool = new FunctionTool({
  name: 'validate_gaps_grades',
  description:
    'Validates the LLM-generated evaluations to ensure each sub-question has a valid score, strengths, and gaps. Returns SUCCESS or an ERROR message.',
  parameters: feedbackSchema,
  execute: async ({ strengths, areasForImprovement }) => {
    const hasNoStrengths = !strengths || !strengths.length;
    const hasNoAreasForImprovement = !areasForImprovement || !areasForImprovement.length;

    if (hasNoStrengths && hasNoAreasForImprovement) {
      return {
        status: 'ERROR',
        message: 'Validation failed: The strengths and areas for improvement are blank. Either field cannot be blank.',
      };
    }

    return {
      status: 'SUCCESS',
      message: 'Feedback is valid. You may now generate the final output schema and finish.',
    };
  },
});

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
            text: JSON.stringify(feedback),
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
      "Synthesizes the evaluations of the user's answer against the architectural question into a final feedback report containing strengths and areas for improvement.",
    beforeAgentCallback: createAgentStartCallback('FeedbackAgent'),
    beforeModelCallback: checkFeedbackCallback,
    afterToolCallback: feedbackAfterToolCallback,
    afterAgentCallback: createAgentEndCallback('FeedbackAgent'),
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
