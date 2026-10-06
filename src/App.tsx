import { useRef, useState } from 'react';
import { ApiError } from './api/client';
import { Dropzone } from './components/Dropzone';
import { ErrorBox } from './components/ErrorBox';
import { History } from './components/History';
import { Loader } from './components/Loader';
import { Results } from './components/Results';
import { analyzeDocument, type AnalyzeInput, type Progress } from './lib/analyze';
import { validateFile } from './lib/file';
import {
  addToHistory,
  getBrowserStorage,
  loadHistory,
  type HistoryItem,
} from './lib/history';
import type { Analysis } from './lib/schema';

type State =
  | { status: 'idle' }
  | { status: 'extracting' }
  | { status: 'analyzing'; progress: Progress | null }
  | { status: 'done'; analysis: Analysis }
  | { status: 'error'; message: string; canRetry: boolean };

function progressMessage(progress: Progress | null): string {
  if (!progress) return 'Analiza AI…';
  if (progress.step === 'merging') return 'Łączenie wyników…';
  return progress.total > 1
    ? `Analiza AI… fragment ${progress.current} z ${progress.total}`
    : 'Analiza AI…';
}

export function App() {
  const [state, setState] = useState<State>({ status: 'idle' });
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const storage = getBrowserStorage();
    return storage ? loadHistory(storage) : [];
  });
  const runId = useRef(0);
  const pending = useRef<AnalyzeInput | null>(null);

  const reset = () => {
    runId.current += 1;
    pending.current = null;
    setState({ status: 'idle' });
  };

  const runAnalysis = async (input: AnalyzeInput) => {
    const id = ++runId.current;
    setState({ status: 'analyzing', progress: null });
    try {
      const analysis = await analyzeDocument(input, (progress) => {
        if (id === runId.current) setState({ status: 'analyzing', progress });
      });
      if (id !== runId.current) return;
      const storage = getBrowserStorage();
      if (storage) setHistory(addToHistory(storage, analysis));
      setState({ status: 'done', analysis });
    } catch (error) {
      if (id !== runId.current) return;
      const message =
        error instanceof ApiError
          ? error.message
          : 'Wystąpił nieoczekiwany błąd podczas analizy.';
      setState({ status: 'error', message, canRetry: true });
    }
  };

  const handleFile = async (file: File) => {
    const check = validateFile(file);
    if (!check.ok) {
      setState({ status: 'error', message: check.message, canRetry: false });
      return;
    }
    const id = ++runId.current;
    setState({ status: 'extracting' });
    try {
      const { extractPdfText } = await import('./lib/pdf');
      const { text, pages } = await extractPdfText(file);
      if (id !== runId.current) return;
      const input = { fileName: file.name, pages, text };
      pending.current = input;
      await runAnalysis(input);
    } catch (error) {
      if (id !== runId.current) return;
      const message =
        error instanceof Error && error.name === 'NoTextLayerError'
          ? error.message
          : 'Nie udało się odczytać pliku. Może być uszkodzony lub zabezpieczony hasłem.';
      setState({ status: 'error', message, canRetry: false });
    }
  };

  const retry = () => {
    if (pending.current) void runAnalysis(pending.current);
  };

  const busy = state.status === 'extracting' || state.status === 'analyzing';

  return (
    <main className="app">
      <header className="app__header">
        <h1>PDF Insight</h1>
        <p className="muted">
          Wgraj PDF, a zobaczysz krótkie podsumowanie i uporządkowane dane do pobrania w
          JSON.
        </p>
      </header>

      {state.status === 'idle' || busy ? (
        <Dropzone onFile={handleFile} disabled={busy} />
      ) : null}

      {state.status === 'idle' ? (
        <>
          <p className="notice">
            Zawartość wgranego pliku zostaje wysłana do zewnętrznego API AI (Google
            Gemini) w celu analizy. Nie wgrywaj dokumentów, których nie chcesz
            udostępniać.
          </p>
          <p className="empty">Nie wgrano jeszcze żadnego pliku.</p>
          <History
            items={history}
            onSelect={(item) => setState({ status: 'done', analysis: item.analysis })}
          />
        </>
      ) : null}

      {state.status === 'extracting' ? <Loader message="Odczyt tekstu z PDF…" /> : null}
      {state.status === 'analyzing' ? (
        <Loader message={progressMessage(state.progress)} />
      ) : null}

      {state.status === 'error' ? (
        <ErrorBox
          message={state.message}
          onRetry={state.canRetry ? retry : null}
          onReset={reset}
        />
      ) : null}

      {state.status === 'done' ? (
        <Results analysis={state.analysis} onReset={reset} />
      ) : null}
    </main>
  );
}
