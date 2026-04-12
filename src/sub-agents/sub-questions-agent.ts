import {
  BaseAgent,
  FunctionTool,
  LlmAgent,
  SingleAfterToolCallback,
  SingleAgentCallback,
  SingleBeforeModelCallback,
} from '@google/adk';
import { createAfterToolCallback } from '../callbacks/after-tool-retry-callback.js';
import {
  createAgentEndCallback,
  logStartTimeAndResetStatesBeforeAgentCallback,
} from '../callbacks/performance-callback.js';
import { hashQuestion, retrieveSubQuestions, saveSubQuestions } from '../persistence/firestore.js';
import { PERSIST_SUB_QUESTIONS, SUB_QUESTIONS_KEY } from './output-keys.const.js';
import { generateSubQuestionsPrompt } from './prompts/sub-questions.prompt.js';
import { subQuestionsSchema } from './types/audit-feedback.type.js';
import { generateFaileStateKey, getAuditFeedbackContext, hasUniqueStrings, isValidSubquestionsList } from './utils.js';

const failedStateKey = generateFaileStateKey(SUB_QUESTIONS_KEY);

const subQuestionsAfterToolCallback = createAfterToolCallback(
  `STOP processing immediately. Max validation attempts reached. Return an empty list of sub-questions if none.`,
  SUB_QUESTIONS_KEY,
);

function setPersistSubQuestionsFlagAfterToolCallback(): SingleAfterToolCallback {
  return async (parameters) => {
    if (!parameters || !parameters.context || !parameters.context.state || !parameters.tool) {
      return undefined;
    }

    const toolName = parameters.tool.name;
    const agentName = parameters.context.agentName;

    console.log(`AfterToolCallback: Agent ${agentName} executed ${toolName} to set PERSIST_SUB_QUESTIONS to true.`);

    const fatalError = subQuestionsAfterToolCallback(parameters);
    if (fatalError) {
      return fatalError;
    }

    parameters.context.state.set(PERSIST_SUB_QUESTIONS, true);
    return undefined;
  };
}

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
      finalizedData: subQuestions,
      message: 'The question is decomposed into a list of sub-questions successfully.',
    };
  },
});

const subQuestionsAlreadyGeneratedCallback: SingleBeforeModelCallback = async ({ context }) => {
  console.log(
    `beforeModelCallback: Agent ${context.agentName} checked if sub-questions are already present and valid before calling LLM.`,
  );

  const { question } = getAuditFeedbackContext(context);
  if (context?.state?.get<boolean>(failedStateKey) || !question) {
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

  const hashKey = hashQuestion(question);
  const persistedSubQuestions = await retrieveSubQuestions(hashKey);

  if (persistedSubQuestions && persistedSubQuestions.length > 0) {
    return {
      content: {
        role: 'model',
        parts: [
          {
            text: JSON.stringify({ texts: persistedSubQuestions }),
          },
        ],
      },
    };
  }

  const { subQuestions } = getAuditFeedbackContext(context);
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

const saveSubQuestionsAfterAgentCallback: SingleAgentCallback = async (context) => {
  if (!context || !context.state) {
    return undefined;
  }

  const toPersist = context.state.get<boolean>(PERSIST_SUB_QUESTIONS);
  if (toPersist) {
    const { question, subQuestions } = getAuditFeedbackContext(context);
    if (question && isValidSubquestionsList(subQuestions)) {
      const hashKey = hashQuestion(question);
      const isoDateString = await saveSubQuestions(hashKey, subQuestions?.texts as string[]);
      console.log(`Sub-questions persisted at ${isoDateString}.`);
    }
  }
};

export function createSubQuestionsAgent(model: string): BaseAgent {
  const agentName = 'SubQuestionsAgent';
  return new LlmAgent({
    name: agentName,
    model,
    description:
      'Decomposes a complex question into smaller, manageable sub-questions for better analysis and structured feedback.',
    beforeAgentCallback: logStartTimeAndResetStatesBeforeAgentCallback(failedStateKey),
    beforeModelCallback: subQuestionsAlreadyGeneratedCallback,
    instruction: (context) => {
      const { question, answer } = getAuditFeedbackContext(context);
      if (!question || !answer) {
        return '';
      }

      return generateSubQuestionsPrompt(question);
    },
    afterToolCallback: setPersistSubQuestionsFlagAfterToolCallback(),
    afterAgentCallback: [saveSubQuestionsAfterAgentCallback, createAgentEndCallback(agentName)],
    tools: [validateSubQuestionsTool],
    outputSchema: subQuestionsSchema,
    outputKey: SUB_QUESTIONS_KEY,
    disallowTransferToParent: true,
    disallowTransferToPeers: true,
  });
}
