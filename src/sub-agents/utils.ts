import { ReadonlyContext } from '@google/adk';
import {
  ANSWER_KEY,
  AUDIT_TRAIL_KEY,
  CLOUD_STORAGE_KEY,
  MERGED_RESULTS_KEY,
  QUESTION_KEY,
  RECOMMENDATION_KEY,
  SUB_QUESTIONS_KEY,
} from './output-keys.const.js';
import { AuditTrail, CloudStorage, Merger, Recommendation, SubQuestions } from './types/index.js';

export function getAuditFeedbackContext(context: ReadonlyContext | undefined) {
  if (!context || !context.state) {
    return {
      subQuestions: null,
      answer: null,
      question: null,
    };
  }

  const state = context.state;
  return {
    subQuestions: state.get<SubQuestions>(SUB_QUESTIONS_KEY) ?? null,
    answer: context.state.get<string>(ANSWER_KEY, '') ?? null,
    question: context.state.get<string>(QUESTION_KEY, '') ?? null,
  };
}

export function getAggregateContext(context: ReadonlyContext | undefined) {
  if (!context || !context.state) {
    return {
      auditTrail: null,
      cloudStorage: null,
      recommendation: null,
    };
  }

  const state = context.state;
  return {
    auditTrail: state.get<AuditTrail>(AUDIT_TRAIL_KEY) ?? null,
    cloudStorage: state.get<CloudStorage>(CLOUD_STORAGE_KEY) ?? null,
    recommendation: state.get<Recommendation>(RECOMMENDATION_KEY) ?? null,
  };
}

export function getMergerContext(context: ReadonlyContext | undefined) {
  if (!context || !context.state) {
    return {
      merger: null,
    };
  }

  const state = context.state;
  return {
    merger: state.get<Merger>(MERGED_RESULTS_KEY) ?? null,
  };
}

export function isValidSubquestionsList(obj_sub_questions: SubQuestions | null): boolean {
  if (!obj_sub_questions) {
    return false;
  }
  const { texts: sub_questions } = obj_sub_questions;
  if (!sub_questions || !sub_questions.length) {
    return false;
  }

  return sub_questions.every((sub_question) => sub_question);
}
