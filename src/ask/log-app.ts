import { appDb } from '@/local/instance';

import { clearQuestions, countQuestions, listQuestions, logQuestion, setVerdict, toCsv, type Entry, type Verdict } from './question-log';

/** On-phone wrappers: a log must never get in the way of an answer, so every one of these swallows its own errors. */
export async function keepQuestion(e: Entry): Promise<number | null> {
  try {
    return await logQuestion(await appDb(), e);
  } catch {
    return null;
  }
}

export async function markQuestion(id: number | null | undefined, verdict: Verdict, meant?: string): Promise<void> {
  if (id == null) return;
  try {
    await setVerdict(await appDb(), id, verdict, meant);
  } catch {
    // ignored on purpose
  }
}

export const questionCount = async (): Promise<number> => {
  try {
    return await countQuestions(await appDb());
  } catch {
    return 0;
  }
};

export const questionsCsv = async (): Promise<string> => toCsv(await listQuestions(await appDb()));

export async function deleteQuestions(): Promise<void> {
  try {
    await clearQuestions(await appDb());
  } catch {
    // ignored on purpose
  }
}
