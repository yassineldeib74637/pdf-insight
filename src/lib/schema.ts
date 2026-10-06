import { z } from 'zod';

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data musi mieć format ISO 8601 (RRRR-MM-DD)')
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
  }, 'Nieprawidłowa data');

export const DOCUMENT_TYPES = ['faktura', 'umowa', 'oferta', 'raport', 'inne'] as const;

export const analysisSchema = z.object({
  document: z.object({
    fileName: z.string().min(1),
    pages: z.number().int().positive(),
    language: z.string().regex(/^[a-z]{2}$/, 'Kod języka ISO 639-1'),
    type: z.enum(DOCUMENT_TYPES),
    title: z.string().nullable(),
    date: isoDate.nullable(),
  }),
  summary: z.string().min(20).max(1500),
  keyPoints: z.array(z.string().min(1)).min(3).max(7),
  entities: z.object({
    organizations: z.array(z.string().min(1)),
    people: z.array(z.string().min(1)),
  }),
  amounts: z.array(
    z.object({
      value: z.number().finite(),
      currency: z.string().regex(/^[A-Z]{3}$/, 'Kod waluty ISO 4217'),
      context: z.string(),
    }),
  ),
  dates: z.array(z.object({ date: isoDate, context: z.string() })),
  keywords: z.array(z.string().min(1)),
  warnings: z.array(z.string()).default([]),
});

export type Analysis = z.infer<typeof analysisSchema>;

/** Fields the model is asked to produce; fileName and pages are known client-side. */
export const modelOutputSchema = analysisSchema.omit({ warnings: true }).extend({
  document: analysisSchema.shape.document.omit({ fileName: true, pages: true }),
});

export type ModelOutput = z.infer<typeof modelOutputSchema>;
