import type { ZodType } from 'zod';
import { ApiError, callAnalyze, type AnalyzeRequest } from '../api/client';
import { chunkText } from './chunk';
import { INJECTION_WARNING, detectInjection } from './injection';
import {
  analysisSchema,
  modelOutputSchema,
  type Analysis,
  type ModelOutput,
} from './schema';

export type Caller = (request: AnalyzeRequest) => Promise<unknown>;

/**
 * Calls the model and validates the answer. An invalid answer gets exactly one retry,
 * then an ApiError('invalid_model_output') is thrown. Transport errors are not retried here.
 */
export async function requestValidated<T>(
  call: Caller,
  request: AnalyzeRequest,
  schema: ZodType<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const raw = await call(request);
      const parsed = schema.safeParse(raw);
      if (parsed.success) return parsed.data;
    } catch (error) {
      if (!(error instanceof ApiError) || error.code !== 'invalid_model_output')
        throw error;
    }
  }
  throw new ApiError('invalid_model_output');
}

export interface AnalyzeInput {
  fileName: string;
  pages: number;
  text: string;
}

export type Progress =
  { step: 'analyzing'; current: number; total: number } | { step: 'merging' };

export async function analyzeDocument(
  input: AnalyzeInput,
  onProgress: (progress: Progress) => void = () => undefined,
  call: Caller = callAnalyze,
): Promise<Analysis> {
  const chunks = chunkText(input.text);
  let model: ModelOutput;

  if (chunks.length === 1) {
    onProgress({ step: 'analyzing', current: 1, total: 1 });
    model = await requestValidated(
      call,
      { mode: 'analyze', text: input.text },
      modelOutputSchema,
    );
  } else {
    const partials: ModelOutput[] = [];
    for (const [index, text] of chunks.entries()) {
      onProgress({ step: 'analyzing', current: index + 1, total: chunks.length });
      partials.push(
        await requestValidated(call, { mode: 'analyze', text }, modelOutputSchema),
      );
    }
    onProgress({ step: 'merging' });
    model = await requestValidated(call, { mode: 'merge', partials }, modelOutputSchema);
  }

  const candidate = {
    ...model,
    document: { ...model.document, fileName: input.fileName, pages: input.pages },
    warnings: detectInjection(input.text) ? [INJECTION_WARNING] : [],
  };
  const final = analysisSchema.safeParse(candidate);
  if (!final.success) throw new ApiError('invalid_model_output');
  return final.data;
}
