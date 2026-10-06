import { describe, expect, it } from 'vitest';
import { analysisSchema } from './schema';

const valid = {
  document: {
    fileName: 'umowa.pdf',
    pages: 4,
    language: 'pl',
    type: 'umowa',
    title: 'Umowa serwisowa',
    date: '2026-09-01',
  },
  summary:
    'Umowa określa zasady świadczenia usług serwisowych przez okres dwunastu miesięcy.',
  keyPoints: ['Okres umowy 12 mies.', 'Płatność w 14 dni', 'SLA 99,5%'],
  entities: { organizations: ['Przykład sp. z o.o.'], people: [] },
  amounts: [{ value: 12500, currency: 'PLN', context: 'wynagrodzenie' }],
  dates: [{ date: '2026-10-01', context: 'termin płatności' }],
  keywords: ['serwis', 'SLA'],
};

describe('analysisSchema', () => {
  it('accepts a valid analysis and defaults warnings to []', () => {
    const result = analysisSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.warnings).toEqual([]);
  });

  it('accepts null date and null title', () => {
    const result = analysisSchema.safeParse({
      ...valid,
      document: { ...valid.document, date: null, title: null },
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty arrays for missing information', () => {
    const result = analysisSchema.safeParse({
      ...valid,
      amounts: [],
      dates: [],
      keywords: [],
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown document type', () => {
    const result = analysisSchema.safeParse({
      ...valid,
      document: { ...valid.document, type: 'pozew' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-ISO and impossible dates', () => {
    expect(
      analysisSchema.safeParse({
        ...valid,
        dates: [{ date: '01.10.2026', context: 'x' }],
      }).success,
    ).toBe(false);
    expect(
      analysisSchema.safeParse({
        ...valid,
        dates: [{ date: '2026-02-31', context: 'x' }],
      }).success,
    ).toBe(false);
  });

  it('rejects bad currency codes and non-numeric amounts', () => {
    expect(
      analysisSchema.safeParse({
        ...valid,
        amounts: [{ value: 10, currency: 'zł', context: 'x' }],
      }).success,
    ).toBe(false);
    expect(
      analysisSchema.safeParse({
        ...valid,
        amounts: [{ value: '10', currency: 'PLN', context: 'x' }],
      }).success,
    ).toBe(false);
  });

  it('rejects too few or too many key points', () => {
    expect(analysisSchema.safeParse({ ...valid, keyPoints: ['a', 'b'] }).success).toBe(
      false,
    );
    expect(
      analysisSchema.safeParse({
        ...valid,
        keyPoints: Array.from({ length: 8 }, (_, i) => `p${i}`),
      }).success,
    ).toBe(false);
  });

  it('rejects missing required sections', () => {
    const withoutSummary = { ...valid, summary: undefined };
    expect(analysisSchema.safeParse(withoutSummary).success).toBe(false);
  });
});
