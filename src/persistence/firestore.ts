import { createHash } from 'crypto';

export function hashQuestion(input: string): string {
  if (!input) {
    throw new Error('Invalid input');
  }
  const key = input.trim().toLowerCase();
  return createHash('sha256').update(key).digest('hex');
}

import { Firestore } from '@google-cloud/firestore';

const firestore = new Firestore();

export async function retrieveSubQuestions(hashKey: string) {
  const document = firestore.doc(`questions/${hashKey}`);
  const subQuestions = await document.get();

  const data = subQuestions.data();
  return data && data.subQuestions ? (data.subQuestions as string[]) : [];
}

export async function saveSubQuestions(hashKey: string, subQuestions: string[]) {
  const document = firestore.doc(`questions/${hashKey}`);
  const result = await document.set({ subQuestions });

  return result.writeTime.toDate().toISOString();
}
