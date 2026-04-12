import { ReadonlyContext } from '@google/adk';
import { ANSWER_KEY, FEEDBACK_KEY, GAPS_GRADES_KEY, QUESTION_KEY, SUB_QUESTIONS_KEY } from './output-keys.const.js';
import { Feedback, GapsGrades, SubQuestions } from './types/audit-feedback.type.js';

export function getAuditFeedbackContext(context: ReadonlyContext | undefined) {
  if (!context || !context.state) {
    return {
      [QUESTION_KEY]: null,
      [ANSWER_KEY]: null,
      [SUB_QUESTIONS_KEY]: null,
      [GAPS_GRADES_KEY]: null,
      [FEEDBACK_KEY]: null,
    };
  }

  const state = context.state;
  return {
    [QUESTION_KEY]: state.get<string>(QUESTION_KEY, '') ?? null,
    [ANSWER_KEY]: state.get<string>(ANSWER_KEY, '') ?? null,
    [SUB_QUESTIONS_KEY]: state.get<SubQuestions>(SUB_QUESTIONS_KEY) ?? null,
    [GAPS_GRADES_KEY]: state.get<GapsGrades>(GAPS_GRADES_KEY) ?? null,
    [FEEDBACK_KEY]: state.get<Feedback>(FEEDBACK_KEY) ?? null,
  };
}

export function isNonBlankStringList(items?: string[]) {
  if (!items || !items.length) {
    return false;
  }

  return items.every((item) => item && item.trim().length > 0);
}

export function hasUniqueStrings(texts: string[]): boolean {
  if (!texts || !texts.length) {
    return true; // Technically, an empty list has no duplicates.
  }
  const uniqueSubQuestions = new Set(texts.map((sq) => sq.trim().toLowerCase()));
  return uniqueSubQuestions.size === texts.length;
}

export function isValidSubquestionsList(obj_sub_questions: SubQuestions | null): boolean {
  if (!obj_sub_questions) {
    return false;
  }
  const { texts: sub_questions } = obj_sub_questions;

  return isNonBlankStringList(sub_questions);
}

export function isValidFeedback(feedback: Feedback | null | undefined) {
  return !!feedback && (feedback.strengths.trim() || !!feedback.areasForImprovement.trim());
}
