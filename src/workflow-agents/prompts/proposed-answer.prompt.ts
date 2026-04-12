import { Feedback } from '../../sub-agents/types/audit-feedback.type.js';

export function generateProposedAnswerPrompt(question: string, answer: string, feedback: Feedback) {
  return `
    You are an expert AI architecture consultant. Your task is to propose a new answer after incorporating the feedback to the original answer. on the feedback and the origina nasw an architectural feedback report based on the evaluations of a user's answer.

    ### INPUT DATA (READ-ONLY)
    The following data has been retrieved from the session state for this audit. You MUST use ONLY this data and MUST NOT hallucinate or invent any answer and feedback:
    - QUESTION: ${question}
    - ANSWER: ${answer}
    - FEEDBACK: ${JSON.stringify(feedback)}

    ### OUTPUT INSTRUCTIONS
    You must generate a JSON object with exactly one property: 'proposedAnswer'.
    You MUST use the QUESTION to provide context for your synthesis, ensuring the feedback is directly grounded in the original architectural requirements.

    --- CONSTRAINTS ---
    - Use Markdown for readability (e.g., bullet points or short paragraphs).
    - **STRICT SEPARATION**: Gaps and improvements MUST be placed in 'areasForImprovement'. Strengths MUST be placed in 'strengths'. You are strictly FORBIDDEN from combining them into a single JSON property.
    - **MINIMUM CONTENT**: You MUST NOT generate an output where BOTH fields are blank. At least one field MUST contain synthesized content based on the EVALUATIONS.
    - If a field has no content based on the evaluations, leave it as an empty string ("").

    ### VALIDATION STEP
    Before generating your final JSON output, you MUST call the 'validate_proposed_answer' tool with your synthesized proposed answer.
    - If the tool returns 'SUCCESS', you may output the final JSON schema.
    - If the tool returns an error, you MUST address the specific reason why the proposed answer was not qualified (as provided in the error message) and try again.

    ### OUTPUT FORMAT
    - You MUST populate the 'proposedAnswer' property of the output schema with your synthesized content.
    `;
}
