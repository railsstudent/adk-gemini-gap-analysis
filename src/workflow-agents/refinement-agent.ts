import { FunctionTool, LlmAgent, SingleBeforeModelCallback } from '@google/adk';
import { createAfterToolCallback } from '../sub-agents/callbacks/after-tool-retry-callback.js';
import { createAgentEndCallback, createAgentStartCallback } from '../sub-agents/callbacks/performance-callback.js';
import { resetSessionStateCallback } from '../sub-agents/callbacks/reset-attempts-callback.js';
import { validateFeedback } from '../sub-agents/feedback.util.js';
import { validateByScore } from '../sub-agents/gaps-grades.util.js';
import { FEEDBACK_KEY } from '../sub-agents/output-keys.const.js';
import { generateFeedbackPrompt } from '../sub-agents/prompts/feedback.prompt.js';
import { feedbackSchema } from '../sub-agents/types/audit-feedback.type.js';
import { getAuditFeedbackContext } from '../sub-agents/utils.js';
import { refineAnswerSchema } from './types/refine-answer.type.js';
import { REFINE_ANSWER_KEY } from './refine_answer_output.js';

const refineAnswerAfterToolCallback = createAfterToolCallback(
  'STOP processing immediately and output the final JSON schema. The refinement cannot be blank or same as the original answer.',
  REFINE_ANSWER_KEY,
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

const checkRefinedAnswerCallback: SingleBeforeModelCallback = async ({ context }) => {
  console.log(`beforeModelCallback: Agent ${context.agentName} validated feedback before calling LLM.`);

  if (context?.state?.get(`${REFINE_ANSWER_KEY}_FAILED`)) {
    console.log('Validation permanently failed. Terminating agent with fallback data.');
    return {
      content: {
        role: 'model',
        parts: [
          {
            text: JSON.stringify({ strengths: '', areasForImprovement: '' }),
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

export function createRefinementAgent(model: string) {
  const agentName = 'RefineAnswerAgent';
  return new LlmAgent({
    name: agentName,
    model,
    description:
      "Synthesizes the evaluations of the user's answer against the architectural question into a final feedback report containing strengths and areas for improvement.",
    beforeAgentCallback: [createAgentStartCallback(agentName), resetSessionStateCallback(FEEDBACK_KEY)],
    beforeModelCallback: checkRefinedAnswerCallback,
    afterToolCallback: refineAnswerAfterToolCallback,
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
    outputSchema: refineAnswerSchema,
    outputKey: REFINE_ANSWER_KEY,
    disallowTransferToParent: true,
    disallowTransferToPeers: true,
  });
}
