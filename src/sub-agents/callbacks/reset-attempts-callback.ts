import { Context } from '@google/adk';
import { VALIDATION_ATTEMPTS_KEY } from '../output-keys.const.js';

export const resetAttemptsCallback = (context: Context) => {
  if (!context || !context.state) {
    return undefined;
  }

  context.state.set(VALIDATION_ATTEMPTS_KEY, 0);
  console.log(`beforeAgentCallback: Agent ${context.agentName} initialized ${VALIDATION_ATTEMPTS_KEY} to 0.`);

  return undefined;
};
