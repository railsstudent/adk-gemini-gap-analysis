import { ReadonlyContext } from '@google/adk';
import {
  ANSWER_KEY,
  GAPS_GRADES_KEY,
  QUESTION_KEY,
  RECOMMENDATION_KEY,
  SUB_QUESTIONS_KEY,
} from './output-keys.const.js';
import { GapsGrades, SubQuestions } from './types/audit-feedback.type.js';
import { Recommendation } from './types/recommendation.type.js';

export function getAuditFeedbackContext(context: ReadonlyContext | undefined) {
  if (!context || !context.state) {
    return {
      question: null,
      answer: null,
      subQuestions: null,
      gapsGrades: null,
    };
  }

  const state = context.state;
  return {
    question: state.get<string>(QUESTION_KEY, '') ?? null,
    answer: state.get<string>(ANSWER_KEY, '') ?? null,
    subQuestions: state.get<SubQuestions>(SUB_QUESTIONS_KEY) ?? null,
    gapsGrades: state.get<GapsGrades>(GAPS_GRADES_KEY) ?? null,
  };
}

export function getAggregateContext(context: ReadonlyContext | undefined) {
  if (!context || !context.state) {
    return {
      recommendation: null,
    };
  }

  const state = context.state;
  return {
    recommendation: state.get<Recommendation>(RECOMMENDATION_KEY) ?? null,
  };
}

export function isNonBlankStringList(items: string[]) {
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
