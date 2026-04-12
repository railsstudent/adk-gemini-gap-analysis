import { Context } from '@google/adk';
import { VALIDATION_ATTEMPTS_KEY } from '../output-keys.const.js';

export const resetSessionStateCallback = (failedKey: string) => {
  return (context: Context) => {
    console.log(`resetSessionStateCallback: Agent ${context.agentName} initialized ${VALIDATION_ATTEMPTS_KEY} to 0.`);
    console.log(`resetSessionStateCallback: Agent ${context.agentName} initialized ${failedKey} to false.`);

    if (!context || !context.state) {
      return undefined;
    }

    context.state.set(VALIDATION_ATTEMPTS_KEY, 0);
    context.state.set(failedKey, false);

    return undefined;
  };
};
