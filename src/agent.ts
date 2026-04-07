import { FunctionTool, LlmAgent, SequentialAgent, SingleAgentCallback } from '@google/adk';
import { z } from 'zod';
import { initSubAgents } from './init.js';
import {
  ANSWER_KEY,
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
  description: 'Stores the new project description to prepare for a fresh evaluation.',
  parameters: z.object({
    question: z.string().describe('The validated question from the audit.'),
    answer: z.string().describe('The validated project description from the user.'),
  }),
  execute: ({ question, answer }, context) => {
    if (!context || !context.state) {
      return { status: 'ERROR', message: 'No session state found.' };
    }

    context.state.set(QUESTION_KEY, question);
    context.state.set(ANSWER_KEY, answer);

    return { status: 'SUCCESS', message: 'question and answer have been updated.' };
  },
});

export const sequentialAuditFeedbackAgent = new SequentialAgent({
  name: 'SequentialAuditFeedbackAgent',
  subAgents: initSubAgents(model),
  description: `
        A sequential pipeline that takes a validated project description and evaluates its suitability for an AI agent architecture. 
        It breaks down the project components, applies decision-tree logic, generates an architectural recommendation, and returns a finalized, merged JSON report.
    `,
});

const resetAuditFeedbackCallback: SingleAgentCallback = (context) => {
  if (!context || !context.state) {
    return undefined;
  }

  const state = context.state;

  // Clear all previous audit feedback data
  state.set(SUB_QUESTIONS_KEY, null);
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
    'The primary orchestrator agent that manages user interaction and controls the evaluation lifecycle for AI agent architectural suitability.',
  beforeAgentCallback: resetAuditFeedbackCallback,
  instruction: `
    1. Ask the user to write a project description.
    2. Evaluate the user's input. If the input is nonsensical, too brief, or clearly does not describe a software, business, or AI project (e.g., "apple and orange", "hello"), politely explain why it is invalid and ask them to provide a proper description. Do NOT proceed to the next step.
    3. ONLY if the input is a valid project description, perform the following in order:
        a. Call 'prepare_evaluation' with the user's description to reset the session state.
        b. Execute 'SequentialEvaluationAgent'.
    4. Return the final result in JSON format.
    `,
  tools: [prepareAuditFeedbackTool],
  subAgents: [sequentialAuditFeedbackAgent],
});
