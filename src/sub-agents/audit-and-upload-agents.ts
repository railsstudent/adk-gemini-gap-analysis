import {
  BaseAgent,
  Event,
  InvocationContext,
  ParallelAgent,
  ReadonlyContext,
  createEvent,
  createEventActions,
} from '@google/adk';
import crypto from 'node:crypto';
import { AUDIT_TRAIL_KEY, CLOUD_STORAGE_KEY } from './output-keys.js';
import { getEvaluationContext } from './utils.js';

function generateURL(text: string, timestamp: string) {
  const recommendationLen = text.length;
  return recommendationLen > 0 ? `https://example.com/recommendation-${recommendationLen}-${timestamp}.pdf` : '';
}

class AuditTrailAgent extends BaseAgent {
  constructor() {
    super({
      name: 'AuditTrailAgent',
      description:
        'Validates and formats the evaluation session data into a structured audit record before persisting it to the system logs.',
    });
  }

  protected async *runAsyncImpl(context: InvocationContext): AsyncGenerator<Event, void, void> {
    for await (const event of this.runLiveImpl(context)) {
      yield event;
    }
  }

  protected async *runLiveImpl(context: InvocationContext): AsyncGenerator<Event, void, void> {
    const readonlyCtx = new ReadonlyContext(context);
    const { project, antiPatterns, decision } = getEvaluationContext(readonlyCtx);

    const timestamp = await new Promise<string>((resolve) =>
      setTimeout(() => resolve(new Date(Date.now()).toISOString()), 1000),
    );
    console.log('write_audit_trail timestamp', timestamp);

    const status = project && antiPatterns && decision ? 'success' : 'error';
    const result = {
      status,
      timestamp,
      sessionId: context.session.id,
      invocationId: context.invocationId,
      project,
      antiPatterns,
      decision,
    };

    yield createEvent({
      invocationId: context.invocationId,
      author: this.name,
      branch: context.branch || '',
      content: {
        role: 'model',
        parts: [
          {
            text: JSON.stringify(result),
          },
        ],
      },

      // Mutate the session state by assing a stateDelta
      actions: createEventActions({
        stateDelta: {
          [AUDIT_TRAIL_KEY]: result,
        },
      }),
    });
  }
}

class CloudStorageAgent extends BaseAgent {
  constructor() {
    super({
      name: 'CloudStorageAgent',
      description:
        'Manages the secure generation and upload of the final architectural recommendation report to cloud-based storage.',
    });
  }

  protected async *runAsyncImpl(context: InvocationContext): AsyncGenerator<Event, void, void> {
    for await (const event of this.runLiveImpl(context)) {
      yield event;
    }
  }

  protected async *runLiveImpl(context: InvocationContext): AsyncGenerator<Event, void, void> {
    const readonlyCtx = new ReadonlyContext(context);
    const { recommendation } = getEvaluationContext(readonlyCtx);

    const timestamp = await new Promise<string>((resolve) =>
      setTimeout(() => resolve(new Date(Date.now()).toISOString()), 1500),
    );

    const result = {
      uuid: crypto.randomUUID(),
      status: 'success',
      timestamp,
      url: generateURL(recommendation?.text || '', timestamp),
    };

    yield createEvent({
      invocationId: context.invocationId,
      author: this.name,
      branch: context.branch || '',
      content: {
        role: 'model',
        parts: [
          {
            text: JSON.stringify(result),
          },
        ],
      },
      actions: createEventActions({
        stateDelta: {
          [CLOUD_STORAGE_KEY]: result,
        },
      }),
    });
  }
}

export function createAuditAndUploadAgents() {
  return new ParallelAgent({
    name: 'ParallelAuditReportAgent',
    description:
      'Orchestrates the concurrent execution of the audit logging and report storage sub-agents to optimize workflow latency.',
    subAgents: [new AuditTrailAgent(), new CloudStorageAgent()],
  });
}
