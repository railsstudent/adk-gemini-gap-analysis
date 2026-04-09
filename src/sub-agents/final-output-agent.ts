import { BaseAgent, createEvent, Event, InvocationContext, ReadonlyContext } from '@google/adk';
import { AuditFeedback, Feedback } from './types/audit-feedback.type.js';
import { getAuditFeedbackContext } from './utils.js';

export function createFinalOutputEvent(author: string, context: InvocationContext, feedback: AuditFeedback): Event {
  const { feedback: finalFeedback, overallGrade } = feedback;
  return createEvent({
    invocationId: context.invocationId,
    author: author,
    branch: context.branch || '',
    content: {
      role: 'model',
      parts: [
        {
          text: JSON.stringify({
            overallGrade,
            feedback: finalFeedback,
            sessionId: context.session.id,
            invocationId: context.invocationId,
          }),
        },
      ],
    },
  });
}

class FinalOutputAgent extends BaseAgent {
  constructor() {
    super({
      name: 'FinalOutputAgent',
      description: 'Calculate the overall grade and pack the final output.',
    });
  }

  protected async *runAsyncImpl(context: InvocationContext): AsyncGenerator<Event, void, void> {
    for await (const event of this.runLiveImpl(context)) {
      yield event;
    }
  }

  protected async *runLiveImpl(context: InvocationContext): AsyncGenerator<Event, void, void> {
    const readonlyCtx = new ReadonlyContext(context);
    const { feedback, gapsGrades } = getAuditFeedbackContext(readonlyCtx);

    const evaluations = gapsGrades?.evaluations || [];
    const isAllGood = evaluations.every((evaluation) => evaluation.score === 'Good');
    const isAllPoor = evaluations.every((evaluation) => evaluation.score === 'Poor');

    const isValidFeedback =
      feedback && (feedback.strengths.trim().length > 0 || feedback.areasForImprovement.trim().length > 0);
    const gapFeedback: Feedback = isValidFeedback ? feedback : { strengths: '', areasForImprovement: '' };
    const overallGrade = !isValidFeedback ? 'Poor' : isAllGood ? 'Good' : isAllPoor ? 'Poor' : 'Moderate';

    const emit = (author: string) =>
      createFinalOutputEvent(author, context, {
        overallGrade,
        feedback: gapFeedback,
      });

    yield emit(this.name);
    return;
  }
}

export function createFinalOutputAgent(): BaseAgent {
  return new FinalOutputAgent();
}
