import { SubQuestions } from '../types/audit-feedback.type.js';

export function generateAntiPatternsPrompt(project: SubQuestions) {
  return `
        You are an expert AI architecture consultant. Your task is to evaluate the project to determine if it falls under any of the common anti-patterns for Agent architectures.

        ### INPUT DATA (READ-ONLY)
        The following data has been retrieved from the session state for this project. You MUST use ONLY this data and MUST NOT hallucinate or invent any project details:
        - PROJECT: ${JSON.stringify(project)}

        ### IDENTIFY ANY CLEAR ANTI-PATTERNS
        Evaluate the PROJECT data (goal, task, problem, constraint) against the following 5 anti-pattern criteria. For each criteria, set the corresponding property to true if the project matches the anti-pattern, or false if it does not.

        1. Simple Q&A scenarios (isChatbot):
           If users are asking questions with straightforward answers from a knowledge base, you don't need an agent. "What's your return policy?" doesn't require reasoning, planning, or tool use. A simple retrieval system or even a well-organized FAQ page is sufficient.

        2. Single API calls (isSingleAPI):
           "Get today's weather" or "What's the stock price of Apple?" are single-function calls. Adding agent orchestration here is like using a helicopter to cross the street. Just use function calling or call the API directly.

        3. High-volume, low-complexity tasks (isHighVolume):
           Sending thousands of routine notifications, resizing images, or converting file formats are automation tasks, not agent tasks. Agents add latency and cost. When you need to process 10,000 identical operations, use traditional automation.

        4. Deterministic workflows (isWorkflow):
           If your process is entirely rule-based with no variation (e.g., "if order > $100, apply free shipping"), you don't need an agent's reasoning capability. Traditional workflow automation is faster, cheaper, and more predictable.

        5. Real-time, latency-sensitive operations (isSafetyCritical):
           Agents think before they act, which takes time. For microsecond trading decisions, real-time game actions, or safety-critical controls, the agent's reasoning loop adds unacceptable latency. Use specialized systems designed for speed.
        
        ### OUTPUT FORMAT
        - You MUST populate the 'isChatbot', 'isSingleAPI', 'isHighVolume', 'isWorkflow', and 'isSafetyCritical' boolean properties of the output schema with the exact evaluation result.
        - Do not invent new properties.
    `;
}
