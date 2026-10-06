import { describe, expect, it } from 'vitest';
import { addToHistory, loadHistory } from './history';
import type { Analysis } from './schema';

function fakeStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

const analysis: Analysis = {
  document: {
    fileName: 'a.pdf',
    pages: 1,
    language: 'pl',
    type: 'inne',
    title: null,
    date: null,
  },
  summary: 'Krótki dokument testowy zawierający przykładowe informacje do analizy.',
  keyPoints: ['a', 'b', 'c'],
  entities: { organizations: [], people: [] },
  amounts: [],
  dates: [],
  keywords: [],
  warnings: [],
};

describe('history', () => {
  it('starts empty and tolerates corrupt storage', () => {
    const storage = fakeStorage();
    expect(loadHistory(storage)).toEqual([]);
    storage.setItem('pdf-insight:history', '{not json');
    expect(loadHistory(storage)).toEqual([]);
  });

  it('keeps only the 5 most recent analyses, newest first', () => {
    const storage = fakeStorage();
    for (let i = 0; i < 7; i += 1) {
      addToHistory(storage, {
        ...analysis,
        document: { ...analysis.document, fileName: `f${i}.pdf` },
      });
    }
    const items = loadHistory(storage);
    expect(items).toHaveLength(5);
    expect(items[0]?.analysis.document.fileName).toBe('f6.pdf');
  });

  it('drops stored entries that no longer match the schema', () => {
    const storage = fakeStorage();
    storage.setItem(
      'pdf-insight:history',
      JSON.stringify([{ id: 'x', savedAt: 'y', analysis: {} }]),
    );
    expect(loadHistory(storage)).toEqual([]);
  });
});
