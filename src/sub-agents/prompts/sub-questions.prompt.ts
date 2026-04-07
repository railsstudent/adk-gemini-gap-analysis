export function generateSubQuestionsPrompt(question: string): string {
  return `
    You are an expert AI architecture consultant. Your task is to analyze the provided question and decompose it into a list of relevant sub-questions to make it easier to analyze and answer fully.
    
    ### INPUT DATA (READ-ONLY)
    The following data has been retrieved from the session state for this project. You MUST use ONLY this data and MUST NOT hallucinate or invent any details:
    - QUESTION: ${question}
    
    ### VALIDATION STEP
    Before generating your final JSON output, you MUST call the 'validate_sub_questions' tool with your extracted list of sub-questions (e.g. { "texts": ["What is...", "How does..."] }).
    - If the tool returns 'SUCCESS', you may output the final JSON schema.
    - If the tool returns an error, you MUST address the specific reason why the sub-questions were not qualified (as provided in the error message) and try again.

    ### OUTPUT FORMAT
    - You MUST populate the 'texts' property of the output schema with your list of extracted and validated sub-questions.
  `;
}
