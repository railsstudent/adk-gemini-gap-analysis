import { Event, createEvent } from '@google/adk';
import { marked } from 'marked';
import nodemailer from 'nodemailer';
import { EmailStatusOptions, SmtpConfig } from './types/email.type.js';

/**
 * Creates a standardized ADK event specifically for Email Agent status reporting.
 */
export function createEmailStatusEvent(options: EmailStatusOptions): Event {
  return createEvent({
    invocationId: options.context.invocationId,
    author: options.author,
    branch: options.context.branch || '',
    content: {
      role: 'model',
      parts: [
        {
          text: JSON.stringify({
            status: options.status,
            recommendationText: options.recommendationText,
            sessionId: options.context.session.id,
            invocationId: options.context.invocationId,
          }),
        },
      ],
    },
  });
}

export async function sendEmail(smtpConfig: SmtpConfig, subject: string, text: string) {
  const { host, port, user, pass, from, email: to } = smtpConfig;
  const transporter = nodemailer.createTransport({
    host,
    port,
    auth: user && pass ? { user, pass } : undefined,
    secure: false,
  });

  const html = await marked.parse(text);
  const mailOptions = {
    from,
    to,
    subject,
    text,
    html,
  };
  return transporter.sendMail(mailOptions);
}
