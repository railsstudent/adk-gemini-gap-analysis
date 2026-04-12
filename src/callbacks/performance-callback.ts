import { Context, SingleAgentCallback } from '@google/adk';
import { PERSIST_SUB_QUESTIONS, VALIDATION_ATTEMPTS_KEY } from '../sub-agents/output-keys.const.js';

export function createAgentStartCallback(agentName: string): SingleAgentCallback {
  return (context) => {
    if (!context || !context.state) {
      return undefined;
    }

    const key = `${agentName}_start_time`;

    context.state.set(key, Date.now());
    return undefined;
  };
}

export function logStartTimeAndResetStatesBeforeAgentCallback(failedKey: string) {
  return (context: Context) => {
    const agentName = context.agentName;
    console.log(
      `logStartTimeAndResetStatesBeforeAgentCallback: Agent ${agentName} initialized ${VALIDATION_ATTEMPTS_KEY} to 0.`,
    );
    console.log(`logStartTimeAndResetStatesBeforeAgentCallback: Agent ${agentName} initialized ${failedKey} to false.`);

    if (!context || !context.state) {
      return undefined;
    }

    const key = `${agentName}_start_time`;

    context.state.set(key, Date.now());
    context.state.set(VALIDATION_ATTEMPTS_KEY, 0);
    context.state.set(failedKey, false);
    context.state.set(PERSIST_SUB_QUESTIONS, false);

    return undefined;
  };
}

export function createAgentEndCallback(agentName: string): SingleAgentCallback {
  return (context) => {
    if (!context || !context.state) {
      return undefined;
    }

    const key = `${agentName}_start_time`;
    const now = Date.now();
    const startTime = context.state.get<number>(key) || now;
    console.log(
      `Performance Metrics for Agent "${context.agentName}": Total Elapsed Time: ${(now - startTime) / 1000} seconds.`,
    );
    return undefined;
  };
}
