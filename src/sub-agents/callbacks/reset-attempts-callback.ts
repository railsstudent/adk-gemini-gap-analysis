import { Context } from '@google/adk';
import { VALIDATION_ATTEMPTS_KEY } from '../output-keys.const.js';

export const resetSessionStateCallback = (stateKey: string) => {
  return (context: Context) => {
    const failedKey = `${stateKey}_FAILED`;

    console.log(`beforeAgentCallback: Agent ${context.agentName} initialized ${VALIDATION_ATTEMPTS_KEY} to 0.`);
    console.log(`beforeAgentCallback: Agent ${context.agentName} initialized ${failedKey} to false.`);

    if (!context || !context.state) {
      return undefined;
    }

    context.state.set(VALIDATION_ATTEMPTS_KEY, 0);
    context.state.set(failedKey, false);

    return undefined;
  };
};
