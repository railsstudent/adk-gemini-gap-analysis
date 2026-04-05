import { BeforeAgentCallback, FunctionTool, LlmAgent, SequentialAgent } from '@google/adk';
import { z } from 'zod';
import { initWorkflowAgent } from './init.js';
import {
  ANTI_PATTERNS_KEY,
  AUDIT_TRAIL_KEY,
  CLOUD_STORAGE_KEY,
  DECISION_KEY,
  MERGED_RESULTS_KEY,
  PROJECT_DESCRIPTION_KEY,
  PROJECT_KEY,
  RECOMMENDATION_KEY,
  VALIDATION_ATTEMPTS_KEY,
} from './sub-agents/output-keys.js';

process.loadEnvFile();

const model = process.env.GEMINI_MODEL_NAME || '';
if (!model) {
  throw new Error('GEMINI_MODEL_NAME is not set');
}

const prepareEvaluationTool = new FunctionTool({
  name: 'prepare_evaluation',
  description: 'Resets the session state and stores the new project description to prepare for a fresh evaluation.',
  parameters: z.object({
    description: z.string().describe('The validated project description from the user.'),
  }),
  execute: async ({ description }, context) => {
    if (!context || !context.state) {
      return { status: 'ERROR', message: 'No session state found.' };
    }

    // Set the new description for the ProjectAgent to find
    context.state.set(PROJECT_DESCRIPTION_KEY, description);

    return { status: 'SUCCESS', message: 'State reset and description updated.' };
  },
});

export const sequentialEvaluationAgent = new SequentialAgent({
  name: 'SequentialEvaluationAgent',
  subAgents: initWorkflowAgent(model),
  description: `
        A sequential pipeline that takes a validated project description and evaluates its suitability for an AI agent architecture. 
        It breaks down the project components, applies decision-tree logic, generates an architectural recommendation, and returns a finalized, merged JSON report.
    `,
});

const beforeAgentCallback: BeforeAgentCallback = async (context) => {
  if (!context || !context.state) {
    return undefined;
  }

  const state = context.state;

  // Clear all previous evaluation data
  state.set(PROJECT_KEY, null);
  state.set(ANTI_PATTERNS_KEY, null);
  state.set(DECISION_KEY, null);
  state.set(RECOMMENDATION_KEY, null);
  state.set(AUDIT_TRAIL_KEY, null);
  state.set(CLOUD_STORAGE_KEY, null);
  state.set(MERGED_RESULTS_KEY, null);
  state.set(VALIDATION_ATTEMPTS_KEY, 0);

  console.log('Session state has been reset for a new evaluation cycle.');

  return undefined;
};

export const rootAgent = new LlmAgent({
  name: 'ProjectEvaluationAgent',
  model,
  description:
    'The primary orchestrator agent that manages user interaction and controls the evaluation lifecycle for AI agent architectural suitability.',
  beforeAgentCallback,
  instruction: `
    1. Ask the user to write a project description.
    2. Evaluate the user's input. If the input is nonsensical, too brief, or clearly does not describe a software, business, or AI project (e.g., "apple and orange", "hello"), politely explain why it is invalid and ask them to provide a proper description. Do NOT proceed to the next step.
    3. ONLY if the input is a valid project description, perform the following in order:
        a. Call 'prepare_evaluation' with the user's description to reset the session state.
        b. Execute 'SequentialEvaluationAgent'.
    4. Return the final result in JSON format.
    `,
  tools: [prepareEvaluationTool],
  subAgents: [sequentialEvaluationAgent],
});
