import { BeforeModelCallback, FunctionTool, LlmAgent } from '@google/adk';
import { PROJECT_KEY, VALIDATION_ATTEMPTS_KEY } from './output-keys.js';
import { generateProjectBreakdownPrompt } from './prompts/project.prompt.js';
import { projectSchema } from './types/index.js';
import { getEvaluationContext, isProjectDetailsFilled } from './utils.js';

const MAX_ITERATIONS = 3;

export const validateProjectTool = new FunctionTool({
  name: 'validate_project',
  description:
    'Validates the LLM-generated task, problem, goal, and constraint to ensure they are not blank. Returns SUCCESS or an ERROR message.',
  parameters: projectSchema,
  execute: async ({ task, problem, goal, constraint }, toolContext) => {
    // Track the number of validation attempts in the session state
    let attempts = toolContext?.state.get<number>('VALIDATION_ATTEMPTS') || 0;
    attempts = attempts + 1;
    if (toolContext) {
      toolContext.state.set(VALIDATION_ATTEMPTS_KEY, attempts);
    }

    if (attempts >= MAX_ITERATIONS) {
      console.log(`Max validation attempts reached (${attempts}). Forcing LLM to terminate.`);
      if (toolContext) {
        // Break the internal LLM tool-calling loop
        toolContext.actions.escalate = true;
      }
      return {
        status: 'FATAL_ERROR',
        message: `STOP processing immediately. Max validation attempts reached. Return the most accurate data found so far or empty strings if none.`,
      };
    }

    if (!task) {
      return {
        status: 'ERROR',
        message: "Missing 'task'. Please provide a concise description of the specific action to be performed.",
      };
    } else if (!problem) {
      return {
        status: 'ERROR',
        message: "Missing 'problem'. Please describe the underlying issue or pain point.",
      };
    } else if (!goal) {
      return {
        status: 'ERROR',
        message: "Missing 'goal'. Please specify the desired outcome or objective.",
      };
    } else if (!constraint) {
      return {
        status: 'ERROR',
        message: "Missing 'constraint'. Please list any limitations, requirements, or boundaries.",
      };
    }

    return {
      status: 'SUCCESS',
      message: 'Project breakdown is successful, you can now return the final output schema and finish.',
    };
  },
});

const beforeModelCallback: BeforeModelCallback = async ({ context }) => {
  // If we already have a valid project breakdown (e.g., from a previous loop iteration), stop the loop.
  const { project } = getEvaluationContext(context);
  const { isCompleted } = isProjectDetailsFilled(project);

  if (isCompleted) {
    return {
      content: {
        role: 'model',
        parts: [
          {
            text: JSON.stringify(project),
          },
        ],
      },
    };
  }

  return undefined;
};

export function createProjectAgent(model: string) {
  const projectAgent = new LlmAgent({
    name: 'ProjectAgent',
    model,
    description:
      'Analyzes the user-provided project description to extract and structure its core components, including the primary task, underlying problem, ultimate goal, and architectural constraints.',
    beforeModelCallback,
    instruction: (context) => {
      const { projectDescription } = getEvaluationContext(context);
      if (!projectDescription) {
        return '';
      }

      return generateProjectBreakdownPrompt(projectDescription);
    },
    tools: [validateProjectTool],
    outputSchema: projectSchema,
    outputKey: PROJECT_KEY,
    disallowTransferToParent: true,
    disallowTransferToPeers: true,
  });

  return projectAgent;
}
