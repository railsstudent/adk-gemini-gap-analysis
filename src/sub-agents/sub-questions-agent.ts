import { FunctionTool, LlmAgent, SingleBeforeModelCallback } from '@google/adk';
import { createAfterToolCallback } from './callbacks/after-tool-retry-callback.js';
import { agentEndCallback, agentStartCallback } from './callbacks/performance-callback.js';
import { SUB_QUESTIONS_KEY } from './output-keys.const.js';
import { generateSubQuestionsPrompt } from './prompts/sub-questions.prompt.js';
import { subQuestionsSchema } from './types/index.js';
import { getAuditFeedbackContext } from './utils.js';

const subQuestionsAfterToolCallback = createAfterToolCallback(
  `STOP processing immediately. Max validation attempts reached. Return an empty list of sub-questions if none.`,
);

export const validateSubQuestionsTool = new FunctionTool({
  name: 'validate_sub_questions',
  description:
    'Validates the LLM-generated sub-questions to ensure the array is not empty and each sub-question is not blank. Returns SUCCESS or an ERROR message.',
  parameters: subQuestionsSchema,
  execute: async ({ texts: subQuestions }) => {
    if (!subQuestions || !subQuestions.length) {
      return {
        status: 'ERROR',
        message: 'Sub-questions cannot be a blank list.',
      };
    }

    const idxBlankSubQuestion = subQuestions.findIndex((sq) => !sq.trim());
    if (idxBlankSubQuestion >= 0) {
      return {
        status: 'ERROR',
        message: `Sub-question at index ${idxBlankSubQuestion} is blank.`,
      };
    }

    return {
      status: 'SUCCESS',
      message: 'The question is decomposed into a list of sub-questions successfully.',
    };
  },
});

const beforeModelCallback: SingleBeforeModelCallback = ({ context }) => {
  const { subQuestions } = getAuditFeedbackContext(context);

  console.log(
    `beforeModelCallback: Agent ${context.agentName} validated any missing field in the project breakdown before calling LLM.`,
  );

  if (!subQuestions || !subQuestions.texts || !subQuestions.texts.length) {
    return undefined;
  }

  const { texts: subQuestionsList } = subQuestions;
  if (subQuestionsList.findIndex((sq) => !sq.trim()) >= 0) {
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

export function createSubQuestionsAgent(model: string) {
  const subQuestionsAgent = new LlmAgent({
    name: 'SubQuestionsAgent',
    model,
    description:
      'Analyzes the user-provided project description to extract and structure its core components, including the primary task, underlying problem, ultimate goal, and architectural constraints.',
    beforeAgentCallback: agentStartCallback,
    beforeModelCallback,
    instruction: (context) => {
      const { question } = getAuditFeedbackContext(context);
      if (!question) {
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

  return subQuestionsAgent;
}
