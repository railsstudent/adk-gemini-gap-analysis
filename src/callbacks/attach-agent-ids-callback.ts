import { SingleAgentCallback } from '@google/adk';

export function createAttachIdsAfterAgentCallback(outputKey: string): SingleAgentCallback {
  return (context) => {
    if (!context || !context.state) {
      return undefined;
    }

    const sessionId = context.sessionId;
    const invocationId = context.invocationId;
    const output = context.state.get(outputKey);

    if (output && typeof output === 'object') {
      return {
        role: 'model',
        parts: [
          {
            text: JSON.stringify({
              ...output,
              sessionId,
              invocationId,
            }),
          },
        ],
      };
    }

    return undefined;
  };
}
