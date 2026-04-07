// import { BaseAgent, Event, InvocationContext, ReadonlyContext } from '@google/adk';
// import { createEmailStatusEvent, sendEmail } from './email-util.js';
// import { SmtpConfig } from './types/email.type.js';
// import { getAuditFeedbackContext, getMergerContext } from './utils.js';

// class EmailAgent extends BaseAgent {
//   readonly smtpConfig: SmtpConfig;

//   constructor(smtpConfig: SmtpConfig) {
//     super({
//       name: 'EmailAgent',
//       description: 'Send a recommendation and summary email to the administrator.',
//     });

//     this.smtpConfig = smtpConfig;
//   }

//   protected async *runAsyncImpl(context: InvocationContext): AsyncGenerator<Event, void, void> {
//     for await (const event of this.runLiveImpl(context)) {
//       yield event;
//     }
//   }

//   protected async *runLiveImpl(context: InvocationContext): AsyncGenerator<Event, void, void> {
//     const readonlyCtx = new ReadonlyContext(context);
//     const { merger } = getMergerContext(readonlyCtx);
//     const { recommendation } = getAuditFeedbackContext(readonlyCtx);
//     const recommendationText = recommendation?.text || 'No recommendation available.';

//     const emit = (status: 'success' | 'error', author: string) =>
//       createEmailStatusEvent({
//         author,
//         context,
//         status,
//         recommendationText,
//       });

//     if (!merger) {
//       yield emit('error', this.name);
//       return;
//     }

//     try {
//       const emailContent = `${recommendation?.text || ''}\n\n## Summary\n\n${merger.summary}`;
//       await sendEmail(this.smtpConfig, 'Project Evaluation Results', emailContent);
//       yield emit('success', this.name);
//     } catch (e) {
//       console.error(e);
//       yield emit('error', this.name);
//     }
//   }
// }

// export function createEmailAgent(): BaseAgent {
//   const email = process.env.ADMIN_EMAIL || 'admin@test.local';
//   const host = process.env.SMTP_HOST || 'localhost';
//   const port = parseInt(process.env.SMTP_PORT || '1025');
//   const user = process.env.SMTP_USER || '';
//   const pass = process.env.SMTP_PASS || '';
//   const from = process.env.SMTP_FROM || 'no-reply@test.local';

//   const smtpConfig: SmtpConfig = {
//     host,
//     port,
//     user,
//     pass,
//     from,
//     email,
//   };

//   return new EmailAgent(smtpConfig);
// }
