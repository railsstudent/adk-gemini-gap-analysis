import { BaseAgent, FunctionTool, LlmAgent, SingleBeforeModelCallback } from '@google/adk';
import { validateByScore } from './agent-utils/gaps-grades.util.js';
import { createAfterToolCallback } from '../callbacks/after-tool-retry-callback.js';
import { createAgentEndCallback, createAgentStartCallback } from '../callbacks/performance-callback.js';
import { resetSessionStateCallback } from '../callbacks/reset-attempts-callback.js';
import { GAPS_GRADES_KEY } from './output-keys.const.js';
import { generateGapsGradesPrompt } from './prompts/gaps-grades.prompt.js';
import { gapsGradesSchema } from './types/audit-feedback.type.js';
import { generateFaileStateKey, getAuditFeedbackContext, hasUniqueStrings, isValidSubquestionsList } from './utils.js';

const failedStateKey = generateFaileStateKey(GAPS_GRADES_KEY);

const gapsGradesAfterToolCallback = createAfterToolCallback(
  `STOP processing immediately and output the final JSON schema with an empty list of evaluations.`,
  GAPS_GRADES_KEY,
);

export const validGapsGradesTool = new FunctionTool({
  name: 'validate_gaps_grades',
  description:
    'Validates the LLM-generated evaluations to ensure each sub-question has a valid score, strengths, and gaps. Returns SUCCESS or an ERROR message.',
  parameters: gapsGradesSchema,
  execute: async ({ evaluations }) => {
    if (!evaluations || !evaluations.length) {
      return {
        status: 'ERROR',
        message:
          'Validation failed: The evaluations array is empty or missing. Please provide a valid list of evaluations.',
      };
    }

    for (const evaluation of evaluations) {
      const validationResult = validateByScore(evaluation);
      if (validationResult) {
        return validationResult;
      }
    }

    if (!hasUniqueStrings(evaluations.map((e) => e.subQuestion))) {
      return {
        status: 'ERROR',
        message:
          'Validation failed: The evaluations array contains duplicate sub-question entries. Please consolidate all strengths and gaps for each sub-question into exactly one entry.',
      };
    }

    return {
      status: 'SUCCESS',
      finalizedData: { evaluations },
      message: `Evaluations are valid. You MUST now generate the final output schema EXACTLY matching the following JSON. Do NOT change, add, or remove any strengths, gaps, or scores:\n\n${JSON.stringify({ evaluations })}\n\nOutput this exact JSON structure to complete your task.`,
    };
  },
});

const validGapsGradesCallback: SingleBeforeModelCallback = async ({ context }) => {
  console.log(`beforeModelCallback: Agent ${context.agentName} validated gaps and grade before calling LLM.`);

  const { gapsGrades, subQuestions } = getAuditFeedbackContext(context);
  const { evaluations } = gapsGrades || { evaluations: [] };

  if (evaluations && evaluations.length > 0 && subQuestions && subQuestions.texts) {
    if (evaluations.length === subQuestions.texts.length) {
      const evaluationSubquestions = evaluations.map((e) => e.subQuestion);
      const allUnique = hasUniqueStrings(evaluationSubquestions);
      const allValidEvaluations = evaluations.every((evaluation) => !validateByScore(evaluation));

      if (allUnique && allValidEvaluations) {
        return {
          content: {
            role: 'model',
            parts: [
              {
                text: JSON.stringify(gapsGrades),
              },
            ],
          },
        };
      }
    }
  }

  return undefined;
};

export function createGapsGradesAgent(model: string): BaseAgent {
  const agentName = 'GapsGradesAgent';
  return new LlmAgent({
    name: agentName,
    model,
    description:
      "Evaluates the user's answer against the generated sub-questions to identify strengths and gaps, providing a structured grade for each criterion.",
    beforeAgentCallback: [createAgentStartCallback(agentName), resetSessionStateCallback(failedStateKey)],
    beforeModelCallback: validGapsGradesCallback,
    instruction: (context) => {
      const { subQuestions, answer } = getAuditFeedbackContext(context);
      if (answer && answer.trim().length > 0 && isValidSubquestionsList(subQuestions)) {
        return generateGapsGradesPrompt(answer, subQuestions?.texts || []);
      }

      return 'Skipping LLM due to incomplete SUB-QUESTIONS and/or answer data.';
    },
    afterToolCallback: gapsGradesAfterToolCallback,
    afterAgentCallback: createAgentEndCallback(agentName),
    tools: [validGapsGradesTool],
    outputSchema: gapsGradesSchema,
    outputKey: GAPS_GRADES_KEY,
    disallowTransferToParent: true,
    disallowTransferToPeers: true,
  });
}
