import { Evaluation } from '../types/audit-feedback.type.js';

export function generateFeedbackPrompt(evaluations: Evaluation[]) {
  return `
    You are an expert AI architecture consultant. Your task is to synthesize an architectural recommendation report based on Google's Agent Fundamentals.

    ### INPUT DATA (READ-ONLY)
    The following data has been retrieved from the session state for this project. You MUST use ONLY this data and MUST NOT hallucinate or invent any project details:
    - EVALUATIONS: ${JSON.stringify(evaluations)}

    ### OUTPUT FORMAT
    - The Markdown string MUST contain:
        - Main Heading: "## Recommendation".
        - Content:
            - You MUST start the content with 1 to 2 sentences that concisely summarize the task, goal, problem, and constraint found in the PROJECT object.
            - Follow this with 1 to 2 short, concise paragraphs summarizing the architectural recommendation based on the logic guidelines above.
            - Summary: A heading "### Key points" followed by a bulleted list of technical rationales.
    `;
}
