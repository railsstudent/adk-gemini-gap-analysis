import { BaseAgent, Context, FunctionTool, LlmAgent, SingleBeforeModelCallback } from '@google/adk';
import { createAfterToolCallback } from './callbacks/after-tool-retry-callback.js';
import { createAgentEndCallback, createAgentStartCallback } from './callbacks/performance-callback.js';
import { validateByScore } from './gaps-grades.util.js';
import { GAPS_GRADES_KEY, VALIDATION_ATTEMPTS_KEY } from './output-keys.const.js';
import { generateGapsGrades } from './prompts/gaps-grades.prompt.js';
import { gapsGradesSchema } from './types/audit-feedback.type.js';
import { getAuditFeedbackContext, isValidSubquestionsList } from './utils.js';

const gapsGradesAfterToolCallback = createAfterToolCallback(
  `STOP processing immediately and output the final JSON schema with an empty list of evaluations.`,
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

    return {
      status: 'SUCCESS',
      message: 'Evaluations are valid. You may now generate the final output schema and finish.',
    };
  },
});

const validGapsGradesCallback: SingleBeforeModelCallback = async ({ context }) => {
  console.log(`beforeModelCallback: Agent ${context.agentName} validated gaps and grade before calling LLM.`);

  const { gapsGrades, subQuestions } = getAuditFeedbackContext(context);
  const { evaluations } = gapsGrades || { evaluations: [] };

  if (evaluations && evaluations.length > 0 && subQuestions && subQuestions.texts) {
    if (evaluations.length === subQuestions.texts.length) {
      const allValidEvaluations = evaluations.every((evaluation) => !validateByScore(evaluation));
      if (allValidEvaluations) {
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

const resetAttemptsCallback = (context: Context) => {
  if (!context || !context.state) {
    return undefined;
  }

  context.state.set(VALIDATION_ATTEMPTS_KEY, 0);
  console.log(`beforeAgentCallback: Agent ${context.agentName} initialized ${VALIDATION_ATTEMPTS_KEY} to 0.`);

  return undefined;
};

export function createGapsGradesAgent(model: string): BaseAgent {
  return new LlmAgent({
    name: 'GapsGradesAgent',
    model,
    description:
      "Evaluates the user's answer against the generated sub-questions to identify strengths and gaps, providing a structured grade for each criterion.",
    beforeAgentCallback: [resetAttemptsCallback, createAgentStartCallback('GapsGradesAgent')],
    beforeModelCallback: validGapsGradesCallback,
    instruction: (context) => {
      const { subQuestions, answer } = getAuditFeedbackContext(context);
      if (answer && answer.trim().length > 0 && isValidSubquestionsList(subQuestions)) {
        return generateGapsGrades(answer, subQuestions?.texts || []);
      }

      return 'Skipping LLM due to incomplete SUB-QUESTIONS and/or answer data.';
    },
    afterToolCallback: gapsGradesAfterToolCallback,
    afterAgentCallback: createAgentEndCallback('GapsGradesAgent'),
    tools: [validGapsGradesTool],
    outputSchema: gapsGradesSchema,
    outputKey: GAPS_GRADES_KEY,
    disallowTransferToParent: true,
    disallowTransferToPeers: true,
  });
}
