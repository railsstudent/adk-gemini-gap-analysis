import { LlmAgent } from '@google/adk';
import { MERGED_RESULTS_KEY } from './output-keys.js';
import { generateMergerPrompt } from './prompts/merger.prompt.js';
import { mergerSchema } from './types/index.js';
import { getAggregateContext } from './utils.js';

export function createMergerAgent(model: string) {
  return new LlmAgent({
    name: 'MergerAgent',
    model,
    description:
      'Aggregates the asynchronous results from the audit trail, cloud storage, and recommendation phases into a cohesive, schema-validated JSON response for the user.',
    instruction: (context) => {
      const { auditTrail, recommendation, cloudStorage } = getAggregateContext(context);
      return generateMergerPrompt(recommendation, auditTrail, cloudStorage);
    },
    outputSchema: mergerSchema,
    outputKey: MERGED_RESULTS_KEY,
    disallowTransferToParent: true,
    disallowTransferToPeers: true,
  });
}
