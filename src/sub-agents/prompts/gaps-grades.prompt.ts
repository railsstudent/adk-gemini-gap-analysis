export function generateGapsGrades(answer: string, subQuestions: string[]) {
  return `
        You are an expert AI architecture consultant. Your task is to evaluate an architectural answer against a set of specific sub-questions to identify strengths and gaps, and provide a structured grade for each criterion.

        ### INPUT DATA (READ-ONLY)
        The following data has been retrieved from the session state for this project. You MUST use ONLY this data and MUST NOT hallucinate or invent any project details:
        - ANSWER: ${answer}
        - SUB_QUESTIONS: ${JSON.stringify(subQuestions)}

        ### EVALUATION INSTRUCTIONS (CHAIN-OF-THOUGHT)
        For each sub-question in the SUB_QUESTIONS list, you must perform the following steps in order to derive the correct score, strengths, and gaps.

        **Step 1: Analyze the answer against the sub-question.**
        Read the ANSWER and determine how well it addresses the specific sub-question.

        **Step 2: Apply Evaluation Tests**
        - **Completeness Test:** Does the answer directly address all parts of the sub-question with specific, actionable details?
        - **Specificity Test:** Does the answer use technical specifics (naming tools, methods, or parameters) rather than generic terms?
        - **Viability Test:** Is the answer logically sound, relevant, and sufficiently detailed for architectural planning?

        **Step 3: Determine Score**
        Based on the tests above, assign exactly one of the following scores:
        - **Good (Passes Completeness):** The answer fully addresses the criterion. There are notable strengths and NO significant gaps.
        - **Moderate (Fails Specificity):** The answer addresses the core idea but lacks technical detail, ignores a constraint, or misses a sub-component of the question (notable gaps).
        - **Poor (Fails Viability):** The answer is missing entirely, is irrelevant, or is too vague to be useful for architectural planning (major gaps).

        **Step 4: Populate Output Arrays**
        You MUST strictly follow these rules when populating the output:
        - If the score is **Good**: Populate the \`strengths\` array. You MUST leave the \`gaps\` array empty.
        - If the score is **Moderate**: Populate the \`gaps\` array. You MAY also populate the \`strengths\` array to acknowledge what the answer addressed correctly.
        - If the score is **Poor**: Populate the \`gaps\` array. You MUST leave the \`strengths\` array empty to emphasize the fundamental viability issues.

        ### VALIDATION STEP
        Before generating your final JSON output, you MUST call the 'validate_gaps_grades' tool with your chosen evaluations (e.g. { "evaluations": [] }).
        - Ensure the \`subQuestion\` field matches the exact text from the SUB_QUESTIONS list.
        - If the tool returns 'SUCCESS', you may output the final JSON schema.
        - If the tool returns an 'ERROR', you MUST fix the specific validation failures before trying again.

        ### OUTPUT FORMAT
        - You MUST populate the 'subQuestion', 'score', 'strengths' and 'gaps' properties of the output schema with the exact result.
        - Do not invent new scores.
        - Do not invent new sub-questions. You MUST evaluate exactly the ones provided in the SUB_QUESTIONS list, neither adding nor omitting any.
    `;
}
