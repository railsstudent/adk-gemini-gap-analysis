import { BaseAgent, Context, FunctionTool, LlmAgent, SingleBeforeModelCallback } from '@google/adk';
import { createAfterToolCallback } from './callbacks/after-tool-retry-callback.js';
import { agentEndCallback, agentStartCallback } from './callbacks/performance-callback.js';
import { GAPS_GRADES_KEY, VALIDATION_ATTEMPTS_KEY } from './output-keys.const.js';
import { generateGapsGrades } from './prompts/gaps-grades.prompt.js';
import { Evaluation, gapsGradesSchema } from './types/audit-feedback.type.js';
import { getAuditFeedbackContext, hasUniqueStrings, isNonBlankStringList, isValidSubquestionsList } from './utils.js';

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
      if (!['Good', 'Moderate', 'Poor'].includes(evaluation.score)) {
        return {
          status: 'ERROR',
          message: "Validation failed: An invalid score was provided. The score must be 'Good', 'Moderate', or 'Poor'.",
        };
      } else if (evaluation.score === 'Good') {
        if (!isNonBlankStringList(evaluation.strengths)) {
          return {
            status: 'ERROR',
            message:
              "Validation failed: The 'strengths' array contains null, empty, or blank entries. Please provide valid strength descriptions.",
          };
        }
        if (evaluation.gaps && evaluation.gaps.length > 0) {
          return {
            status: 'ERROR',
            message:
              "Validation failed: You assigned a 'Good' score but provided gaps. For a 'Good' score, the gaps array must be empty. Please either remove the gaps or adjust the score to 'Moderate'.",
          };
        }
        if (!hasUniqueStrings(evaluation.strengths)) {
          return {
            status: 'ERROR',
            message:
              "Validation failed: The 'strengths' array contains duplicate entries. Please ensure all strength descriptions are unique.",
          };
        }
      } else if (evaluation.score === 'Moderate') {
        if (!isNonBlankStringList(evaluation.gaps)) {
          return {
            status: 'ERROR',
            message:
              "Validation failed: You assigned a 'Moderate' score but provided no gaps. A 'Moderate' score requires identifying the notable gaps that prevented a 'Good' score.",
          };
        }
        if (!hasUniqueStrings(evaluation.gaps)) {
          return {
            status: 'ERROR',
            message:
              "Validation failed: The 'gaps' array contains duplicate entries. Please ensure all gap descriptions are unique.",
          };
        }
        if (evaluation.strengths && evaluation.strengths.length > 0) {
          if (!isNonBlankStringList(evaluation.strengths)) {
            return {
              status: 'ERROR',
              message:
                "Validation failed: The 'strengths' array contains null, empty, or blank entries. Please provide valid strength descriptions or leave the array empty.",
            };
          }
          if (!hasUniqueStrings(evaluation.strengths)) {
            return {
              status: 'ERROR',
              message:
                "Validation failed: The 'strengths' array contains duplicate entries. Please ensure all strength descriptions are unique.",
            };
          }
        }
      } else if (evaluation.score === 'Poor') {
        if (!isNonBlankStringList(evaluation.gaps)) {
          return {
            status: 'ERROR',
            message:
              "Validation failed: The 'gaps' array contains null, empty, or blank entries. Please provide valid gap descriptions.",
          };
        }
        if (evaluation.strengths && evaluation.strengths.length > 0) {
          return {
            status: 'ERROR',
            message:
              "Validation failed: You assigned a 'Poor' score but provided strengths. A 'Poor' score indicates fundamental viability issues; the strengths array must be empty. Please remove the strengths or adjust the score to 'Moderate'.",
          };
        }
        if (!hasUniqueStrings(evaluation.gaps)) {
          return {
            status: 'ERROR',
            message:
              "Validation failed: The 'gaps' array contains duplicate entries. Please ensure all gap descriptions are unique.",
          };
        }
      }
    }

    return {
      status: 'SUCCESS',
      message: 'Evaluations are valid. You may now generate the final output schema and finish.',
    };
  },
});

function isValidEvaluation(evaluation: Evaluation): boolean {
  const score = evaluation.score;
  const isValidGrade = ['Good', 'Moderate', 'Poor'].includes(score);
  if (!isValidGrade) {
    return false;
  }

  if (score === 'Good') {
    const isValidStrengths = isNonBlankStringList(evaluation.strengths) && hasUniqueStrings(evaluation.strengths);
    const hasGaps = evaluation.gaps && evaluation.gaps.length > 0;
    if (!isValidStrengths || hasGaps) {
      return false;
    }
  } else if (score === 'Moderate') {
    const isValidGaps = isNonBlankStringList(evaluation.gaps) && hasUniqueStrings(evaluation.gaps);
    if (!isValidGaps) {
      return false;
    }
    if (evaluation.strengths && evaluation.strengths.length > 0) {
      const isValidStrengths = isNonBlankStringList(evaluation.strengths) && hasUniqueStrings(evaluation.strengths);
      if (!isValidStrengths) {
        return false;
      }
    }
  } else if (score === 'Poor') {
    const isValidGaps = isNonBlankStringList(evaluation.gaps) && hasUniqueStrings(evaluation.gaps);
    const hasStrengths = evaluation.strengths && evaluation.strengths.length > 0;
    if (!isValidGaps || hasStrengths) {
      return false;
    }
  }

  return true;
}

const validGapsGradesCallback: SingleBeforeModelCallback = async ({ context }) => {
  console.log(`beforeModelCallback: Agent ${context.agentName} validated gaps and grade before calling LLM.`);

  const { gapsGrades, subQuestions } = getAuditFeedbackContext(context);
  const { evaluations } = gapsGrades || { evaluations: [] };

  if (evaluations && evaluations.length > 0 && subQuestions && subQuestions.texts) {
    if (evaluations.length === subQuestions.texts.length) {
      const allValidEvaluations = evaluations.every((evaluation) => isValidEvaluation(evaluation));
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
    beforeAgentCallback: [resetAttemptsCallback, agentStartCallback],
    beforeModelCallback: validGapsGradesCallback,
    instruction: (context) => {
      const { subQuestions, answer } = getAuditFeedbackContext(context);
      if (answer && answer.trim().length > 0 && isValidSubquestionsList(subQuestions)) {
        return generateGapsGrades(answer, subQuestions?.texts || []);
      }

      return 'Skipping LLM due to incomplete SUB-QUESTIONS and/or answer data.';
    },
    afterToolCallback: gapsGradesAfterToolCallback,
    afterAgentCallback: agentEndCallback,
    tools: [validGapsGradesTool],
    outputSchema: gapsGradesSchema,
    outputKey: GAPS_GRADES_KEY,
    disallowTransferToParent: true,
    disallowTransferToPeers: true,
  });
}
