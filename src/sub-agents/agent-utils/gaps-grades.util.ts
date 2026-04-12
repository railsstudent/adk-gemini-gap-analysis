import { Evaluation } from '../types/audit-feedback.type.js';
import { hasUniqueStrings, isNonBlankStringList } from '../utils.js';

function validateGoodScore(evaluation: Evaluation) {
  if (!isNonBlankStringList(evaluation.strengths)) {
    return {
      status: 'ERROR',
      message:
        "Validation failed: The 'strengths' array contains null, empty, or blank entries. Please provide valid strength descriptions.",
    };
  }

  if (evaluation.gaps && evaluation.gaps.length > 0) {
    return {
      status: 'ERROR',
      message:
        "Validation failed: You assigned a 'Good' score but provided gaps. For a 'Good' score, the gaps array must be empty. Please either remove the gaps or adjust the score to 'Moderate'.",
    };
  }

  if (!hasUniqueStrings(evaluation.strengths)) {
    return {
      status: 'ERROR',
      message:
        "Validation failed: The 'strengths' array contains duplicate entries. Please ensure all strength descriptions are unique.",
    };
  }
}

function validateModerateScore(evaluation: Evaluation) {
  if (!isNonBlankStringList(evaluation.gaps)) {
    return {
      status: 'ERROR',
      message:
        "Validation failed: You assigned a 'Moderate' score but provided no gaps. A 'Moderate' score REQUIRES identifying the notable gaps that prevented a 'Good' score. If you have both strengths and gaps for this sub-question, you MUST consolidate them into this single evaluation object.",
    };
  }

  if (!hasUniqueStrings(evaluation.gaps)) {
    return {
      status: 'ERROR',
      message:
        "Validation failed: The 'gaps' array contains duplicate entries. Please ensure all gap descriptions are unique.",
    };
  }

  if (evaluation.strengths && evaluation.strengths.length > 0) {
    if (!isNonBlankStringList(evaluation.strengths)) {
      return {
        status: 'ERROR',
        message:
          "Validation failed: The 'strengths' array contains null, empty, or blank entries. Please provide valid strength descriptions or leave the array empty.",
      };
    }
    if (!hasUniqueStrings(evaluation.strengths)) {
      return {
        status: 'ERROR',
        message:
          "Validation failed: The 'strengths' array contains duplicate entries. Please ensure all strength descriptions are unique.",
      };
    }
  }
}

function validatePoorScore(evaluation: Evaluation) {
  if (!isNonBlankStringList(evaluation.gaps)) {
    return {
      status: 'ERROR',
      message:
        "Validation failed: You assigned a 'Poor' score but provided no gaps. A 'Poor' score REQUIRES identifying the major gaps. Please provide valid gap descriptions in the 'gaps' array.",
    };
  }

  if (evaluation.strengths && evaluation.strengths.length > 0) {
    return {
      status: 'ERROR',
      message:
        "Validation failed: You assigned a 'Poor' score but provided strengths. A 'Poor' score indicates fundamental viability issues; the strengths array must be empty. Please remove the strengths or adjust the score to 'Moderate'.",
    };
  }

  if (!hasUniqueStrings(evaluation.gaps)) {
    return {
      status: 'ERROR',
      message:
        "Validation failed: The 'gaps' array contains duplicate entries. Please ensure all gap descriptions are unique.",
    };
  }
}

export function validateByScore(evaluation: Evaluation) {
  const score = evaluation.score;

  if (!['Good', 'Moderate', 'Poor'].includes(score)) {
    return {
      status: 'ERROR',
      message: "Validation failed: An invalid score was provided. The score must be 'Good', 'Moderate', or 'Poor'.",
    };
  }

  if (score === 'Good') {
    return validateGoodScore(evaluation);
  } else if (score === 'Moderate') {
    return validateModerateScore(evaluation);
  } else if (score === 'Poor') {
    return validatePoorScore(evaluation);
  }

  return undefined;
}
