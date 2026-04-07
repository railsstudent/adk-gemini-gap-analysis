import { Evaluation } from '../types/audit-feedback.type.js';

export function generateFeedbackPrompt(question: string, answer: string, evaluations: Evaluation[]) {
  return `
    You are an expert AI architecture consultant. Your task is to synthesize an architectural feedback report based on the evaluations of a user's answer.

    ### INPUT DATA (READ-ONLY)
    The following data has been retrieved from the session state for this project. You MUST use ONLY this data and MUST NOT hallucinate or invent any project details:
    - QUESTION: ${question}
    - ANSWER: ${answer}
    - EVALUATIONS: ${JSON.stringify(evaluations)}

    ### OUTPUT INSTRUCTIONS
    You must generate a JSON object containing 'strengths' and 'areasForImprovement' based on the EVALUATIONS.
    You MUST use the QUESTION to provide context for your synthesis, ensuring the feedback is directly grounded in the original architectural requirements.

    1. **strengths**:
       - Review the 'strengths' arrays within the EVALUATIONS.
       - If there are strengths, synthesize these into a cohesive, Markdown-formatted summary (e.g., using bullet points) that highlights what the user did well in their ANSWER.
       - The Markdown string MUST start with the heading "### Strengths:".
       - If there are no strengths in the evaluations, leave this field blank.

    2. **areasForImprovement**:
       - Review the 'gaps' arrays within the EVALUATIONS.
       - If there are gaps, synthesize these into a cohesive, Markdown-formatted summary (e.g., using bullet points) detailing the gaps, missing technical specifics, or viability issues in their ANSWER.
       - The Markdown string MUST start with the heading "### Areas for Improvement:".
       - If there are no gaps in the evaluations, leave this field blank.

    ### CONSTRAINTS
    - You MUST use Markdown formatting for the text within the string values.
    - **CRITICAL**: You MUST NOT generate an output where BOTH 'strengths' and 'areasForImprovement' are blank. At least one field must contain synthesized content based on the evaluations.
    `;
}
