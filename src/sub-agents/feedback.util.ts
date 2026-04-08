import { Feedback } from './types/audit-feedback.type.js';

export function validateFeedback(feedback: Feedback) {
  const { strengths, areasForImprovement } = feedback;
  const hasNoStrengths = !strengths || !strengths.trim().length;
  const hasNoAreasForImprovement = !areasForImprovement || !areasForImprovement.trim().length;

  const strengthsHeader = '### Strengths:';
  const areasForImprovementHeader = '### Areas for Improvement:';

  if (hasNoStrengths && hasNoAreasForImprovement) {
    return {
      status: 'ERROR',
      message: 'Validation failed: The strengths and areas for improvement are blank. Either field cannot be blank.',
    };
  }

  if (!hasNoStrengths && !strengths.trim().startsWith(strengthsHeader)) {
    return {
      status: 'ERROR',
      message: `Validation failed: The strengths does not start with '${strengthsHeader}'`,
    };
  }

  if (!hasNoAreasForImprovement && !areasForImprovement.trim().startsWith(areasForImprovementHeader)) {
    return {
      status: 'ERROR',
      message: `Validation failed: The areas for improvement does not start with '${areasForImprovementHeader}'`,
    };
  }

  return undefined;
}
