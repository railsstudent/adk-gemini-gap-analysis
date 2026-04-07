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
    You must generate a JSON object with exactly two properties: 'strengths' and 'areasForImprovement'.
    You MUST use the QUESTION to provide context for your synthesis, ensuring the feedback is directly grounded in the original architectural requirements.

    --- FIELD DEFINITIONS ---

    **strengths**:
    - **Source**: Use ONLY the 'strengths' arrays from the EVALUATIONS.
    - **Content**: Synthesize a cohesive Markdown summary of what the user did well in their ANSWER.
    - **Format**: The string MUST start with the heading "### Strengths:".
    - **STRICT RULE**: You MUST NOT include any gaps, criticisms, or areas for improvement in this field.

    **areasForImprovement**:
    - **Source**: Use ONLY the 'gaps' arrays from the EVALUATIONS.
    - **Content**: Synthesize a cohesive Markdown summary detailing the gaps, missing technical specifics, or viability issues found in their ANSWER.
    - **Format**: The string MUST start with the heading "### Areas for Improvement:".
    - **STRICT RULE**: You MUST NOT include any strengths or positive feedback in this field.

    --- CONSTRAINTS ---
    - Use Markdown (e.g., bullet points) within the string values for readability.
    - **STRICT SEPARATION**: Gaps and improvements MUST be placed in 'areasForImprovement'. Strengths MUST be placed in 'strengths'. You are strictly FORBIDDEN from combining them into a single JSON property.
    - **MINIMUM CONTENT**: You MUST NOT generate an output where BOTH fields are blank. At least one field MUST contain synthesized content based on the EVALUATIONS.
    - If a field has no content based on the evaluations, leave it as an empty string ("").
    `;
}
