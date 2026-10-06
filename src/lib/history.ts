import { analysisSchema, type Analysis } from './schema';

const KEY = 'pdf-insight:history';
const MAX_ITEMS = 5;

export interface HistoryItem {
  id: string;
  savedAt: string;
  analysis: Analysis;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export function loadHistory(storage: StorageLike): HistoryItem[] {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const items: HistoryItem[] = [];
    for (const entry of parsed) {
      const analysis = analysisSchema.safeParse(entry?.analysis);
      if (
        analysis.success &&
        typeof entry.id === 'string' &&
        typeof entry.savedAt === 'string'
      ) {
        items.push({ id: entry.id, savedAt: entry.savedAt, analysis: analysis.data });
      }
    }
    return items.slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

export function addToHistory(storage: StorageLike, analysis: Analysis): HistoryItem[] {
  const item: HistoryItem = {
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
    analysis,
  };
  const next = [item, ...loadHistory(storage)].slice(0, MAX_ITEMS);
  try {
    storage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage may be full or blocked; history is a convenience only.
  }
  return next;
}

/** Returns localStorage, or null when the browser blocks access to it. */
export function getBrowserStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
