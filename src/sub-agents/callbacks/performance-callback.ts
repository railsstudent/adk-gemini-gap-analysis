import { SingleAgentCallback } from '@google/adk';

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
