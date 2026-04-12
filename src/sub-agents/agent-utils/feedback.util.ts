import { Feedback } from '../types/audit-feedback.type.js';

export function validateFeedback(feedback: Feedback) {
  const { strengths, areasForImprovement } = feedback;
  const hasNoStrengths = !strengths || !strengths.trim().length;
  const hasNoAreasForImprovement = !areasForImprovement || !areasForImprovement.trim().length;

  const strengthsHeader = '## Strengths:';
  const areasForImprovementHeader = '## Areas for Improvement';

  if (hasNoStrengths && hasNoAreasForImprovement) {
    return {
      status: 'ERROR',
      message:
        'Validation failed: Both the strengths and areas for improvement fields are blank. At least one field MUST contain content.',
    };
  }

  if (!hasNoStrengths && !strengths.trim().startsWith(strengthsHeader)) {
    return {
      status: 'ERROR',
      message: `Validation failed: The strengths field does not start with the required heading '${strengthsHeader}'`,
    };
  }

  if (!hasNoAreasForImprovement && !areasForImprovement.trim().startsWith(areasForImprovementHeader)) {
    return {
      status: 'ERROR',
      message: `Validation failed: The areas for improvement field does not start with the required heading '${areasForImprovementHeader}'`,
    };
  }

  return undefined;
}
