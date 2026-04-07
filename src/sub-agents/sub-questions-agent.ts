import { BaseAgent, FunctionTool, LlmAgent, SingleBeforeModelCallback } from '@google/adk';
import { createAfterToolCallback } from './callbacks/after-tool-retry-callback.js';
import { agentEndCallback, agentStartCallback } from './callbacks/performance-callback.js';
import { SUB_QUESTIONS_KEY } from './output-keys.const.js';
import { generateSubQuestionsPrompt } from './prompts/sub-questions.prompt.js';
import { subQuestionsSchema } from './types/audit-feedback.type.js';
import { getAuditFeedbackContext, hasUniqueStrings, isValidSubquestionsList } from './utils.js';

const subQuestionsAfterToolCallback = createAfterToolCallback(
  `STOP processing immediately. Max validation attempts reached. Return an empty list of sub-questions if none.`,
);

export const validateSubQuestionsTool = new FunctionTool({
  name: 'validate_sub_questions',
  description:
    'Validates the LLM-generated sub-questions. Requires at least 2 unique, non-blank sub-questions. Returns SUCCESS or an ERROR message.',
  parameters: subQuestionsSchema,
  execute: async (subQuestions) => {
    const isSubQuestionsGenerated = isValidSubquestionsList(subQuestions);

    if (!isSubQuestionsGenerated) {
      return {
        status: 'ERROR',
        message: 'Validation failed: The list of sub-questions is missing, empty, or contains blank entries.',
      };
    }

    if (subQuestions.texts.length < 2) {
      return {
        status: 'ERROR',
        message: 'Validation failed: Please provide at least 2 sub-questions to ensure a meaningful decomposition.',
      };
    }

    if (!hasUniqueStrings(subQuestions.texts)) {
      return {
        status: 'ERROR',
        message:
          'Validation failed: The list contains duplicated sub-questions. Please ensure each sub-question is unique.',
      };
    }

    return {
      status: 'SUCCESS',
      message: 'The question is decomposed into a list of sub-questions successfully.',
    };
  },
});

const subQuestionsAlreadyGeneratedCallback: SingleBeforeModelCallback = ({ context }) => {
  const { subQuestions } = getAuditFeedbackContext(context);

  console.log(
    `beforeModelCallback: Agent ${context.agentName} checked if sub-questions are already present and valid before calling LLM.`,
  );

  const isSubQuestionsGenerated = isValidSubquestionsList(subQuestions);

  if (!isSubQuestionsGenerated) {
    return undefined;
  }

  // a valid sub-questions list is found.
  return {
    content: {
      role: 'model',
      parts: [
        {
          text: JSON.stringify(subQuestions),
        },
      ],
    },
  };
};

export function createSubQuestionsAgent(model: string): BaseAgent {
  return new LlmAgent({
    name: 'SubQuestionsAgent',
    model,
    description:
      'Decomposes a complex question into smaller, manageable sub-questions for better analysis and structured feedback.',
    beforeAgentCallback: agentStartCallback,
    beforeModelCallback: subQuestionsAlreadyGeneratedCallback,
    instruction: (context) => {
      const { question, answer } = getAuditFeedbackContext(context);
      if (!question || !answer) {
        return '';
      }

      return generateSubQuestionsPrompt(question);
    },
    afterToolCallback: subQuestionsAfterToolCallback,
    afterAgentCallback: agentEndCallback,
    tools: [validateSubQuestionsTool],
    outputSchema: subQuestionsSchema,
    outputKey: SUB_QUESTIONS_KEY,
    disallowTransferToParent: true,
    disallowTransferToPeers: true,
  });
}
