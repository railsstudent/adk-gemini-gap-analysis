import { SubQuestions } from '../types/audit-feedback.type.js';

export function generateDecisionPrompt(project: SubQuestions) {
  return `
        You are an expert AI architecture consultant. Your task is to answer four questions to determine the appropriate solution to the project.

        ### INPUT DATA (READ-ONLY)
        The following data has been retrieved from the session state for this project. You MUST use ONLY this data and MUST NOT hallucinate or invent any project details:
        - PROJECT: ${JSON.stringify(project)}

        ### MAKING THE DECISION: ASK YOURSELF
        1. Use the PROJECT data (goal, task, problem, constraint) to answer questions below:
        2. The nodes of the decision tree are the questions, and the answer (YES/NO) determines the branch to traverse
        3. When the leaf node is reached, the node text is the decision.
        4. DECISION TREE:
            Follow these exact steps in order:

            STEP 1: Multiple Steps
            Does the PROJECT data require multiple steps that depend on each other?
            - If YES: Append 'Need Multiple Steps: YES' to the nodes list. Go to STEP 2.
            - If NO: Append 'Need Multiple Steps: NO' to the nodes list. Go to STEP 3.

            STEP 2: Adaptation (From Step 1 YES)
            Does the PROJECT data need adaptation?
            - If YES: Append 'Need adaptation: YES' to the nodes list. The verdict is 'Use Agent'. (STOP)
            - If NO: Append 'Need adaptation: NO' to the nodes list. The verdict is 'Use Workflow Automation'. (STOP)

            STEP 3: Complex Reasoning (From Step 1 NO)
            Does the PROJECT data need complex reasoning?
            - If YES: Append 'Need complex reasoning: YES' to the nodes list. Go to STEP 4.
            - If NO: Append 'Need complex reasoning: NO' to the nodes list. The verdict is 'Use Simple API'. (STOP)

            STEP 4: External Actions (From Step 3 YES)
            Does the PROJECT data need external actions?
            - If YES: Append 'Need external actions: YES' to the nodes list. The verdict is 'Use Agent'. (STOP)
            - If NO: Append 'Need external actions: NO' to the nodes list. The verdict is 'Use LLM'. (STOP)
        

        ### VALIDATION STEP
        Before generating your final JSON output, you MUST call the 'validate_decision' tool with your chosen verdict (e.g. { "verdict": "Use Agent" }).
        - If the tool returns 'SUCCESS', you may output the final JSON schema.
        - If the tool returns an error, you MUST re-evaluate the decision tree and try again.

        ### OUTPUT FORMAT
        - You MUST populate the 'verdict' and 'nodes' properties of the output schema with the exact result.
        - Do not invent new verdict.
    `;
}
