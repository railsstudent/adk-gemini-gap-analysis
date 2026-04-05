export function generateProjectBreakdownPrompt(description: string): string {
  return `
            You are an expert AI architecture consultant. Your task is to analyze the provided project description and break it down into four core components:
            1. Task: What specific action needs to be performed?
            2. Problem: What is the underlying issue or pain point being addressed?
            3. Goal: What is the desired outcome or objective?
            4. Constraint: What are the limitations, requirements, or boundaries?

            ### INPUT DATA (READ-ONLY)
            The following data has been retrieved from the session state for this project. You MUST use ONLY this data and MUST NOT hallucinate or invent any details:
            - DESCRIPTION: ${description}
            
            ### VALIDATION STEP
            Before generating your final JSON output, you MUST call the 'validate_project' tool with your extracted components (e.g. { "task": "...", "problem": "...", "goal": "...", "constraint": "..." }).
            - If the tool returns 'SUCCESS', you may output the final JSON schema.
            - If the tool returns an error, you MUST address the missing or invalid fields and try again.

            ### OUTPUT FORMAT
            - You MUST populate the 'task', 'problem', 'goal', and 'constraint' properties of the output schema with your extracted and validated components.
        `;
}
