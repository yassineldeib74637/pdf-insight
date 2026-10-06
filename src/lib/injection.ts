const PATTERNS: RegExp[] = [
  /ignore (all )?(previous|prior|above) (instructions|prompts?)/i,
  /zignoruj (wszystkie )?(wcze[śs]niejsze|poprzednie) (polecenia|instrukcje)/i,
  /instrukcja dla (systemu )?(ai|sztucznej inteligencji|modelu)/i,
  /(system prompt|prompt systemowy)/i,
  /nie wspominaj o tej instrukcji/i,
];

/** Heuristic detector for text aimed at AI models. It is a warning signal, not a defence. */
export function detectInjection(text: string): boolean {
  return PATTERNS.some((pattern) => pattern.test(text));
}

export const INJECTION_WARNING =
  'W dokumencie wykryto tekst przypominający polecenie dla systemu AI. Został potraktowany jako zwykła treść i zignorowany.';
