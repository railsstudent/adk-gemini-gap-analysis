import { ReadonlyContext } from '@google/adk';
import { PROPOSED_ANSWER_KEY } from './workflow-agents-output-keys.const.js';
import { ProposedAnswer } from './types/proposed-answer.type.js';

export function getProposedAnswerContext(context: ReadonlyContext | undefined) {
  if (!context || !context.state) {
    return {
      [PROPOSED_ANSWER_KEY]: null,
    };
  }

  const state = context.state;
  return {
    [PROPOSED_ANSWER_KEY]: state.get<ProposedAnswer>(PROPOSED_ANSWER_KEY) ?? null,
  };
}
