# PDF Insight

Aplikacja webowa, która wczytuje plik PDF, tworzy jego krótkie podsumowanie i zamienia treść w uporządkowane dane JSON.

- **Demo:** https://yassineldeib74637.github.io/pdf-insight/
- **Repozytorium:** https://github.com/yassineldeib74637/pdf-insight
- **Log pracy z AI:** [AI_LOG.md](./AI_LOG.md)

## Jak to działa

1. **Wgranie PDF** – drag & drop lub wybór pliku. Tylko PDF, maks. 10 MB (walidacja po stronie przeglądarki).
2. **Odczyt tekstu** – `pdf.js` wyciąga tekst z warstwy tekstowej bezpośrednio w przeglądarce (plik PDF nie jest wysyłany na serwer, wysyłany jest wyłącznie wyciągnięty tekst).
3. **Analiza AI** – tekst trafia do funkcji Supabase Edge Function, która wywołuje Gemini i zwraca JSON.
4. **Wynik** – odpowiedź jest walidowana schematem Zod, a dopiero potem wyświetlana: podsumowanie, punkty kluczowe, podmioty, kwoty, daty, słowa kluczowe, podgląd JSON i pobranie pliku `.json`.

## Architektura

```
Przeglądarka (React SPA, GitHub Pages)
   │  pdf.js: PDF → tekst
   │  POST { mode, text }
   ▼
Supabase Edge Function  `analyze`   (klucz API tylko w sekretach Supabase)
   │  prompt systemowy + tekst jako dane w znacznikach z losowym id
   ▼
Gemini API  →  JSON
   ▲
   │  odpowiedź walidowana Zod; 1 ponowna próba przy błędnym formacie
Przeglądarka
```

Struktura katalogów:

```
src/
  api/          klient HTTP do funkcji (kody błędów → komunikaty po polsku)
  components/   Dropzone, Loader, ErrorBox, Results, History
  lib/          schema (Zod), analyze (pipeline + retry), chunk, pdf, file, history, injection
supabase/functions/analyze/   proxy do modelu AI
.github/workflows/deploy.yml  lint → test → build → deploy na GitHub Pages
```

## Podjęte decyzje

- **Ekstrakcja tekstu w przeglądarce.** Backend nie musi parsować PDF-ów, a do modelu trafia mniej danych. Moduł `pdf.js` jest ładowany leniwie (`import()`), więc pierwsze wejście na stronę jest lekkie.
- **Backend jako cienkie proxy.** GitHub Pages hostuje tylko pliki statyczne, więc klucz do modelu musi być po stronie serwera. Supabase Edge Functions wybrałem, bo daje darmowy plan i sekrety bez własnego serwera.
- **`fileName` i `pages` ustawia aplikacja, nie model.** Te pola są znane na pewno, więc model ich nie zgaduje. Model zwraca resztę schematu.
- **Walidacja po stronie klienta (Zod).** Odpowiedź niezgodna ze schematem jest odrzucana; po jednej ponownej próbie użytkownik widzi komunikat błędu z przyciskiem „Spróbuj ponownie”.
- **Długie dokumenty (F-08).** Tekst dłuższy niż 60 000 znaków jest dzielony na fragmenty po liniach, każdy fragment jest analizowany osobno, a wyniki scalane dodatkowym wywołaniem `merge`.
- **Historia (F-09).** Ostatnie 5 analiz w `localStorage`, każdy wpis jest ponownie walidowany przy odczycie.
- **Dodatkowe pole `warnings`.** Schemat pozwala dodawać pola. `warnings` informuje, że w dokumencie wykryto tekst przypominający polecenie dla AI.

## Bezpieczeństwo

- Klucz API Gemini istnieje wyłącznie jako sekret Supabase (`GEMINI_API_KEY`). Nie ma go w kodzie, w historii Git ani we frontendzie.
- W repozytorium i buildzie są tylko wartości publiczne: adres funkcji i klucz `anon` Supabase (przeznaczony do użycia w przeglądarce).
- **CORS** i sprawdzanie nagłówka `Origin` po stronie funkcji: dozwolona jest domena demo oraz `localhost`.
- **Limity:** rozmiar pliku 10 MB (klient), rozmiar żądania 400 kB i 70 000 znaków tekstu na żądanie (serwer), 30 żądań na IP na 10 minut.
- **Prompt injection:** treść PDF to dane, nie instrukcje.
  - Prompt systemowy mówi modelowi, że tekst dokumentu jest niezaufany i nie wolno wykonywać zawartych w nim poleceń.
  - Tekst jest owinięty w znaczniki z losowym identyfikatorem generowanym przy każdym żądaniu, więc dokument nie może „zamknąć” bloku danych.
  - Wynik i tak przechodzi walidację schematu, a heurystyka po stronie klienta wyświetla ostrzeżenie, jeśli w tekście są typowe formuły ataku.
- Brak `dangerouslySetInnerHTML`; cała treść jest renderowana przez React.
- Użytkownik widzi informację, że treść pliku trafia do zewnętrznego API AI.

## Format wyniku

Struktura zgodna ze schematem z briefu (`document`, `summary`, `keyPoints`, `entities`, `amounts`, `dates`, `keywords`) plus opcjonalne `warnings`. Brak informacji = `null` lub `[]`, daty w ISO 8601, waluty w ISO 4217. Definicja schematu: [`src/lib/schema.ts`](./src/lib/schema.ts).

## Uruchomienie lokalne

Wymagany Node.js 22+.

```bash
npm install
cp .env.example .env     # uzupełnij VITE_API_URL i VITE_SUPABASE_ANON_KEY
npm run dev              # http://localhost:5173/pdf-insight/
```

Skrypty: `npm run lint`, `npm test`, `npm run build`.

### Zmienne środowiskowe

| Zmienna                  | Gdzie                | Opis                                                           |
| ------------------------ | -------------------- | -------------------------------------------------------------- |
| `VITE_API_URL`           | frontend (build)     | adres funkcji `https://<ref>.supabase.co/functions/v1/analyze` |
| `VITE_SUPABASE_ANON_KEY` | frontend (build)     | publiczny klucz `anon` projektu Supabase                       |
| `GEMINI_API_KEY`         | sekret Supabase      | klucz do Gemini API (nigdy w repozytorium)                     |
| `GEMINI_MODEL`           | sekret (opcjonalnie) | nazwa modelu, domyślnie `gemini-2.5-flash`                     |
| `ALLOWED_ORIGIN`         | sekret (opcjonalnie) | dodatkowe dozwolone originy, rozdzielone przecinkami           |

### Własny backend

1. Utwórz projekt Supabase i wdróż funkcję z `supabase/functions/analyze` (włączone `verify_jwt`).
2. Ustaw sekret `GEMINI_API_KEY` w panelu: Edge Functions → Secrets.
3. Wpisz adres funkcji i klucz `anon` do `.env` oraz do `env` w `.github/workflows/deploy.yml`.
4. W repozytorium: Settings → Pages → Source: **GitHub Actions**.

## Testy

`npm test` (Vitest) obejmuje: walidację schematu (poprawne, błędne, `null` i puste listy), logikę ponowienia przy błędnej odpowiedzi AI, dzielenie długich tekstów, historię w `localStorage`, walidację pliku oraz wykrywanie prób prompt injection.

## Znane ograniczenia

- Brak OCR: skany bez warstwy tekstowej są odrzucane z komunikatem.
- Limit żądań działa w pamięci instancji funkcji, więc jest przybliżony (nie zastępuje limitów po stronie dostawcy).
- Heurystyka wykrywania prompt injection łapie tylko znane formuły; główną obroną jest prompt i walidacja schematu.
- Darmowe limity Gemini mogą powodować komunikat o przeciążeniu usługi.
- Plik `package-lock.json` nie jest w repozytorium; wersje zależności są przypięte na stałe w `package.json`.
- Podsumowanie „3–5 zdań” jest wymuszane promptem, a nie twardą walidacją (liczenie zdań w polskich skrótach, np. „sp. z o.o.”, jest zawodne).
