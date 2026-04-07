import { FunctionTool, LlmAgent, SequentialAgent, SingleAgentCallback } from '@google/adk';
import { z } from 'zod';
import { initSubAgents } from './init.js';
import {
  ANSWER_KEY,
  GAPS_GRADES_KEY,
  QUESTION_KEY,
  SUB_QUESTIONS_KEY,
  VALIDATION_ATTEMPTS_KEY,
} from './sub-agents/output-keys.const.js';

process.loadEnvFile();

const model = process.env.GEMINI_MODEL_NAME || '';
if (!model) {
  throw new Error('GEMINI_MODEL_NAME is not set');
}

const prepareAuditFeedbackTool = new FunctionTool({
  name: 'prepare_audit_feedback',
  description: "Stores the audit question and the user's answer to prepare for a fresh evaluation.",
  parameters: z.object({
    question: z.string().describe('The validated question from the audit.'),
    answer: z.string().describe("It is the user's answer to the audit question."),
  }),
  execute: ({ question, answer }, context) => {
    if (!context || !context.state) {
      return { status: 'ERROR', message: 'No session state found.' };
    }

    const minLength = 10;
    if (question.trim().length < minLength) {
      return {
        status: 'ERROR',
        message: 'The question is too short or invalid. Ask the user to provide a more detailed audit question.',
      };
    }

    if (answer.trim().length < 10) {
      return {
        status: 'ERROR',
        message: 'The answer is too short or invalid. Ask the user to provide a more detailed answer.',
      };
    }

    console.log('question', question, 'answer', answer);

    context.state.set(QUESTION_KEY, question);
    context.state.set(ANSWER_KEY, answer);

    return { status: 'SUCCESS', message: 'question and answer have been updated.' };
  },
});

export const sequentialAuditFeedbackAgent = new SequentialAgent({
  name: 'SequentialAuditFeedbackAgent',
  subAgents: initSubAgents(model),
  description: `
        A sequential pipeline that processes a validated audit question and the user's answer. 
        It decomposes the question into sub-questions, evaluates the provided answer against these criteria, and generates a finalized, merged JSON report.
    `,
});

const resetAuditFeedbackCallback: SingleAgentCallback = (context) => {
  if (!context || !context.state) {
    return undefined;
  }

  const state = context.state;

  // Clear all previous audit feedback data
  state.set(SUB_QUESTIONS_KEY, null);
  state.set(GAPS_GRADES_KEY, null);
  state.set(VALIDATION_ATTEMPTS_KEY, 0);

  console.log(
    `beforeAgentCallback: Agent ${context.agentName} has reset the session state for a new audit feedback cycle.`,
  );

  return undefined;
};

export const rootAgent = new LlmAgent({
  name: 'AuditFeedbackAgent',
  model,
  description:
    'The primary orchestrator agent that manages user interaction for audit feedback. There is only one question and one answer to the question in a structured audit pipeline.',
  beforeAgentCallback: resetAuditFeedbackCallback,
  instruction: `
    1. Ask the user to provide an audit question and their answer to that question.
    2. Evaluate the user's input. If the input is nonsensical, too brief, or does not provide a valid question and answer, politely explain why and ask for proper input. Do NOT proceed to the next step.
    3. ONLY if the input is valid, perform the following in order:
        a. Call 'prepare_audit_feedback' with both the audit question and the user's answer to initialize the session state.
        b. Execute 'SequentialAuditFeedbackAgent' to process the audit feedback and decompose the question into sub-questions.
    4. Return the final structured result in JSON format.
  `,
  tools: [prepareAuditFeedbackTool],
  subAgents: [sequentialAuditFeedbackAgent],
});
