// import { LlmAgent, SingleBeforeModelCallback } from '@google/adk';
// import { agentEndCallback, agentStartCallback } from './callbacks/performance-callback.js';
// import { RECOMMENDATION_KEY } from './output-keys.const.js';
// import { generateFailedDecisionPrompt, generateRecommendationPrompt } from './prompts/recommendation.prompt.js';
// import { recommendationSchema } from './types/index.js';
// import { getEvaluationContext, isProjectDetailsFilled } from './utils.js';

// const beforeModelCallback: SingleBeforeModelCallback = async ({ context }) => {
//   const { project, antiPatterns, decision } = getEvaluationContext(context);

//   const { isCompleted } = isProjectDetailsFilled(project);
//   const isDecisionNone = decision && decision.verdict === 'None';

//   console.log(
//     `beforeModelCallback: Agent ${context.agentName} validated project breakdown, anti-patterns, and decision before calling LLM.`,
//   );

//   if ((isCompleted && antiPatterns && decision && decision.verdict !== 'None') || (!isCompleted && isDecisionNone)) {
//     return undefined;
//   } else if (isCompleted && isDecisionNone) {
//     return constructRecommendation(
//       '## Recommendation: Manual Review Required\n\n**Status:** Abnormal Case Detected\n\nThe provided project is complete and valid, but the decision tree could not reach a conclusive verdict (Result: `None`).\n\n**Possible Reasons:**\n- The requirements fall outside of known architectural patterns.\n- There are conflicting constraints and goals that cannot be resolved automatically.\n\n**Next Steps:**\n- Review and refine the constraints or goals.\n- Escalate for manual architectural review.',
//     );
//   }

//   return constructRecommendation(
//     '## Recommendation: Data Required\n\n**Status:** Abnormal Case Detected\n\nNo decision is reached.',
//   );
// };

// function constructRecommendation(recommendation: string) {
//   return {
//     content: {
//       role: 'model',
//       parts: [
//         {
//           text: JSON.stringify({
//             text: recommendation,
//           }),
//         },
//       ],
//     },
//   };
// }

// export function createRecommendationAgent(model: string) {
//   const recommendationAgent = new LlmAgent({
//     name: 'RecommendationAgent',
//     model,
//     description:
//       'Synthesizes the extracted project components, identified anti-patterns, and decision tree verdict into a comprehensive architectural recommendation report.',
//     beforeModelCallback,
//     beforeAgentCallback: agentStartCallback,
//     instruction: (context) => {
//       const { project, antiPatterns, decision } = getEvaluationContext(context);
//       const { isCompleted, missingFields } = isProjectDetailsFilled(project);

//       if (project) {
//         if (!isCompleted && decision && decision.verdict === 'None') {
//           console.log('RecommendationAgent -> generateFailedDecisionPrompt');
//           return generateFailedDecisionPrompt(project, missingFields);
//         } else if (isCompleted && antiPatterns && decision && decision.verdict !== 'None') {
//           console.log('RecommendationAgent -> generateRecommendationPrompt');
//           return generateRecommendationPrompt(project, antiPatterns, decision);
//         }
//       }
//       return 'Skipping LLM due to missing data.';
//     },
//     afterAgentCallback: agentEndCallback,
//     outputSchema: recommendationSchema,
//     outputKey: RECOMMENDATION_KEY,
//     disallowTransferToParent: true,
//     disallowTransferToPeers: true,
//   });

//   return recommendationAgent;
// }
