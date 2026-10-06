import { z } from 'zod';

export type ApiErrorCode =
  | 'config'
  | 'network'
  | 'bad_request'
  | 'forbidden_origin'
  | 'rate_limited'
  | 'upstream_rate_limited'
  | 'payload_too_large'
  | 'missing_api_key'
  | 'upstream_error'
  | 'invalid_model_output';

export const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  config: 'Aplikacja nie jest poprawnie skonfigurowana (brak adresu API).',
  network: 'Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.',
  bad_request: 'Serwer odrzucił zapytanie. Spróbuj z innym plikiem.',
  forbidden_origin: 'Serwer nie akceptuje zapytań z tego adresu.',
  rate_limited: 'Zbyt wiele zapytań. Poczekaj chwilę i spróbuj ponownie.',
  upstream_rate_limited: 'Usługa AI jest chwilowo przeciążona. Spróbuj za minutę.',
  payload_too_large: 'Dokument jest zbyt duży do analizy.',
  missing_api_key: 'Usługa AI nie jest skonfigurowana po stronie serwera.',
  upstream_error: 'Usługa AI zwróciła błąd. Spróbuj ponownie.',
  invalid_model_output:
    'AI zwróciło odpowiedź w nieprawidłowym formacie, także po ponownej próbie.',
};

export class ApiError extends Error {
  readonly code: ApiErrorCode;

  constructor(code: ApiErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = 'ApiError';
    this.code = code;
  }
}

export type AnalyzeRequest =
  { mode: 'analyze'; text: string } | { mode: 'merge'; partials: unknown[] };

const errorBodySchema = z.object({ error: z.string() });
const successBodySchema = z.object({ data: z.unknown() });
const KNOWN_CODES = Object.keys(ERROR_MESSAGES);

function toCode(value: string): ApiErrorCode {
  return KNOWN_CODES.includes(value) ? (value as ApiErrorCode) : 'upstream_error';
}

/** Sends one request to the Edge Function proxy and returns the raw (unvalidated) model JSON. */
export async function callAnalyze(request: AnalyzeRequest): Promise<unknown> {
  const url = import.meta.env.VITE_API_URL;
  if (!url) throw new ApiError('config');
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(anonKey ? { Authorization: `Bearer ${anonKey}`, apikey: anonKey } : {}),
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    throw new ApiError('network');
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsedError = errorBodySchema.safeParse(payload);
    throw new ApiError(
      parsedError.success ? toCode(parsedError.data.error) : 'upstream_error',
    );
  }
  const parsed = successBodySchema.safeParse(payload);
  if (!parsed.success) throw new ApiError('invalid_model_output');
  return parsed.data.data;
}
