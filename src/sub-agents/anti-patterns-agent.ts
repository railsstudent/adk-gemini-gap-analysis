// import { LlmAgent, SingleBeforeModelCallback } from '@google/adk';
// import { agentEndCallback, agentStartCallback } from './callbacks/performance-callback.js';
// import { ANTI_PATTERNS_KEY } from './output-keys.const.js';
// import { generateAntiPatternsPrompt } from './prompts/anit-patterns.prompt.js';
// import { antiPatternsSchema } from './types/index.js';
// import { getEvaluationContext, isProjectDetailsFilled } from './utils.js';

// const beforeModelCallback: SingleBeforeModelCallback = async ({ context }) => {
//   const { project } = getEvaluationContext(context);
//   const { isCompleted } = isProjectDetailsFilled(project);

//   console.log(
//     `beforeModelCallback: Agent ${context.agentName} validated project breakdown in valid before calling LLM`,
//   );

//   // When the project breakdown is incomplete, we cannot determine the anti-patterns
//   if (!isCompleted) {
//     return {
//       content: {
//         role: 'model',
//         parts: [
//           {
//             text: JSON.stringify(null),
//           },
//         ],
//       },
//     };
//   }

//   return undefined;
// };

// export function createAnitPatternsAgent(model: string) {
//   const antiPatternsAgent = new LlmAgent({
//     name: 'AntiPatternsAgent',
//     model,
//     description:
//       'Evaluates the project against known architectural anti-patterns to determine if it is better suited for traditional automation, direct API calls, or simple retrieval systems instead of an AI agent.',
//     beforeAgentCallback: agentStartCallback,
//     beforeModelCallback,
//     instruction: (context) => {
//       const { project } = getEvaluationContext(context);
//       const { isCompleted } = isProjectDetailsFilled(project);

//       if (project && isCompleted) {
//         return generateAntiPatternsPrompt(project);
//       }

//       return 'Skipping LLM due to incomplete project breakdown data.';
//     },
//     afterAgentCallback: agentEndCallback,
//     outputSchema: antiPatternsSchema,
//     outputKey: ANTI_PATTERNS_KEY,
//     disallowTransferToParent: true,
//     disallowTransferToPeers: true,
//   });

//   return antiPatternsAgent;
// }
