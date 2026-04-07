import { FunctionTool, LlmAgent, SequentialAgent } from '@google/adk';
import { z } from 'zod';
import { initSubAgents } from './init.js';
import {
  ANSWER_KEY,
  GAPS_GRADES_KEY,
  QUESTION_KEY,
  SUB_QUESTIONS_KEY,
  VALIDATION_ATTEMPTS_KEY,
} from './sub-agents/output-keys.const.js';
import { createAgentEndCallback, createAgentStartCallback } from './sub-agents/callbacks/performance-callback.js';

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

    context.state.set(QUESTION_KEY, question);
    context.state.set(ANSWER_KEY, answer);

    // Clear all previous audit feedback data to ensure a fresh cycle
    context.state.set(SUB_QUESTIONS_KEY, null);
    context.state.set(GAPS_GRADES_KEY, null);
    context.state.set(VALIDATION_ATTEMPTS_KEY, 0);

    return {
      status: 'SUCCESS',
      message: 'question and answer have been updated, and previous feedback state has been reset.',
    };
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

export const rootAgent = new LlmAgent({
  name: 'AuditFeedbackAgent',
  model,
  description:
    'The primary orchestrator agent that manages user interaction for audit feedback. There is only one question and one answer to the question in a structured audit pipeline.',
  instruction: `
    You are an orchestrator agent that manages the audit feedback pipeline.

    CRITICAL RULE: You MUST treat EVERY user input containing a question and answer as a brand new request. NEVER answer from memory or chat history. You MUST execute your tools every single time, even if the user provides the exact same input twice.

    For EVERY valid user input, you MUST follow these exact steps in order:
    1. Call the 'prepare_audit_feedback' tool with the provided audit question and answer. (This is MANDATORY to reset the system state).
    2. Delegate to the 'SequentialAuditFeedbackAgent' to process the data.
    3. Return the final structured JSON result.

    If the input is nonsensical, too brief, or lacks a valid question/answer, politely explain why and ask for proper input. Do NOT proceed to the tools in that case.
  `,
  beforeAgentCallback: createAgentStartCallback('AuditFeedbackAgent'),
  afterAgentCallback: createAgentEndCallback('AuditFeedbackAgent'),
  tools: [prepareAuditFeedbackTool],
  subAgents: [sequentialAuditFeedbackAgent],
});
