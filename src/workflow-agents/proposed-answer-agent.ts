import { FunctionTool, LlmAgent, SingleBeforeModelCallback } from '@google/adk';
import { createAfterToolCallback } from '../callbacks/after-tool-retry-callback.js';
import { createAttachIdsAfterAgentCallback } from '../callbacks/attach-agent-ids-callback.js';
import {
  createAgentEndCallback,
  logStartTimeAndResetStatesBeforeAgentCallback,
} from '../callbacks/performance-callback.js';
import { Feedback } from '../sub-agents/types/audit-feedback.type.js';
import { generateFaileStateKey, getAuditFeedbackContext, isValidFeedback } from '../sub-agents/utils.js';
import { generateProposedAnswerPrompt } from './prompts/proposed-answer.prompt.js';
import { proposedAnswerSchema } from './types/proposed-answer.type.js';
import { getProposedAnswerContext } from './utils.js';
import { PROPOSED_ANSWER_KEY } from './workflow-agents-output-keys.const.js';

const failedStateKey = generateFaileStateKey(PROPOSED_ANSWER_KEY);

const proposedAnswerAfterToolCallback = createAfterToolCallback(
  'STOP processing immediately and output the final JSON schema. The proposed answer cannot be blank or same as the original answer.',
  PROPOSED_ANSWER_KEY,
);

export const validProposedAnswerTool = new FunctionTool({
  name: 'validate_proposed_answer',
  description:
    'Validates the LLM-generated proposed answer to ensure it is not blank and is different from the original answer.',
  parameters: proposedAnswerSchema,
  execute: (proposal, context) => {
    const { answer } = getAuditFeedbackContext(context);

    const validatedResult = validateProposedAnswer(answer, proposal.proposedAnswer);
    if (validatedResult) {
      return validatedResult;
    }

    return {
      status: 'SUCCESS',
      finalizedData: proposal,
      message: `Proposed answer is valid. You MUST now generate the final output schema EXACTLY matching the following JSON. Do NOT change any headings, content, or formatting:\n\n${JSON.stringify(proposal)}\n\nOutput this exact JSON structure to complete your task.`,
    };
  },
});

function validateProposedAnswer(answer: string | null, proposedAnswer: string) {
  const trimmedProposedAnswer = proposedAnswer.trim().toLowerCase();
  const isInvalidProposedAnswer = !trimmedProposedAnswer || trimmedProposedAnswer === answer?.trim().toLowerCase();

  if (isInvalidProposedAnswer) {
    return {
      status: 'ERROR',
      message: 'Validation failed: The proposed answer cannot be blank or the same as the original answer.',
    };
  }

  return undefined;
}

function canGenerateProposedAnswer(answer: string | null, feedback: Feedback | null) {
  if (!answer || answer.trim().length === 0) {
    return false;
  }

  return isValidFeedback(feedback);
}

const checkProposedAnswercallback: SingleBeforeModelCallback = async ({ context }) => {
  console.log(`beforeModelCallback: Agent ${context.agentName} validated proposed answer before calling LLM.`);

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

  const { answer, feedback } = getAuditFeedbackContext(context);
  const { proposedAnswer } = getProposedAnswerContext(context);

  // Valid answer
  if (proposedAnswer && !validateProposedAnswer(answer, proposedAnswer.proposedAnswer)) {
    console.log('short-circuit proposed answer');
    return {
      content: {
        role: 'model',
        parts: [
          {
            text: JSON.stringify(proposedAnswer),
          },
        ],
      },
    };
  } else if (!canGenerateProposedAnswer(answer, feedback)) {
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

  return undefined;
};

export function createProposedAnswerAgent(model: string) {
  const agentName = 'ProposedAnswerAgent';
  return new LlmAgent({
    name: agentName,
    model,
    description:
      'Revise the original answer by incorporating the provided feedback and detailed evaluations. The revised answer should preserve existing strengths while realistically addressing identified gaps—either by remediating them or acknowledging them with appropriate context.',
    beforeAgentCallback: logStartTimeAndResetStatesBeforeAgentCallback(failedStateKey),
    beforeModelCallback: checkProposedAnswercallback,
    afterToolCallback: proposedAnswerAfterToolCallback,
    afterAgentCallback: [createAttachIdsAfterAgentCallback(PROPOSED_ANSWER_KEY), createAgentEndCallback(agentName)],
    instruction: (context) => {
      const { answer, feedback, question } = getAuditFeedbackContext(context);

      if (answer && question && feedback && canGenerateProposedAnswer(answer, feedback)) {
        return generateProposedAnswerPrompt(question, answer, feedback);
      }

      return 'Skipping LLM due to invalid inputs.';
    },
    tools: [validProposedAnswerTool],
    outputSchema: proposedAnswerSchema,
    outputKey: PROPOSED_ANSWER_KEY,
    disallowTransferToParent: true,
    disallowTransferToPeers: true,
  });
}
