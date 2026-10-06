import { useState } from 'react';
import type { Analysis } from '../lib/schema';

interface Props {
  analysis: Analysis;
  onReset: () => void;
}

const TYPE_LABELS: Record<Analysis['document']['type'], string> = {
  faktura: 'Faktura',
  umowa: 'Umowa',
  oferta: 'Oferta',
  raport: 'Raport',
  inne: 'Inne',
};

function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString('pl-PL');
}

function formatAmount(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('pl-PL', { style: 'currency', currency }).format(value);
  } catch {
    return `${value} ${currency}`;
  }
}

function downloadJson(analysis: Analysis): void {
  const blob = new Blob([JSON.stringify(analysis, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${analysis.document.fileName.replace(/\.pdf$/i, '')}-insight.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function Results({ analysis, onReset }: Props) {
  const [showJson, setShowJson] = useState(false);
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(analysis, null, 2);
  const { document: doc } = analysis;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="results">
      <div className="results__header">
        <div>
          <h2>{doc.title ?? doc.fileName}</h2>
          <p className="muted">
            {doc.fileName} · {doc.pages} str. · {TYPE_LABELS[doc.type]} · język:{' '}
            {doc.language}
            {doc.date ? ` · ${formatDate(doc.date)}` : ''}
          </p>
        </div>
        <div className="actions">
          <button type="button" className="button" onClick={() => downloadJson(analysis)}>
            Pobierz JSON
          </button>
          <button type="button" className="button button--secondary" onClick={onReset}>
            Nowy plik
          </button>
        </div>
      </div>

      {analysis.warnings.map((warning) => (
        <p key={warning} className="warning" role="note">
          {warning}
        </p>
      ))}

      <section className="card">
        <h3>Podsumowanie</h3>
        <p>{analysis.summary}</p>
      </section>

      <section className="card">
        <h3>Najważniejsze punkty</h3>
        <ul>
          {analysis.keyPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </section>

      <div className="grid">
        <section className="card">
          <h3>Organizacje</h3>
          {analysis.entities.organizations.length ? (
            <ul>
              {analysis.entities.organizations.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">Brak danych</p>
          )}
        </section>
        <section className="card">
          <h3>Osoby</h3>
          {analysis.entities.people.length ? (
            <ul>
              {analysis.entities.people.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">Brak danych</p>
          )}
        </section>
      </div>

      <section className="card">
        <h3>Kwoty</h3>
        {analysis.amounts.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Kwota</th>
                  <th scope="col">Kontekst</th>
                </tr>
              </thead>
              <tbody>
                {analysis.amounts.map((amount, index) => (
                  <tr key={`${amount.value}-${amount.currency}-${index}`}>
                    <td className="nowrap">
                      {formatAmount(amount.value, amount.currency)}
                    </td>
                    <td>{amount.context}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">Brak danych</p>
        )}
      </section>

      <section className="card">
        <h3>Daty</h3>
        {analysis.dates.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Data</th>
                  <th scope="col">Kontekst</th>
                </tr>
              </thead>
              <tbody>
                {analysis.dates.map((entry, index) => (
                  <tr key={`${entry.date}-${index}`}>
                    <td className="nowrap">{formatDate(entry.date)}</td>
                    <td>{entry.context}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">Brak danych</p>
        )}
      </section>

      <section className="card">
        <h3>Słowa kluczowe</h3>
        {analysis.keywords.length ? (
          <ul className="tags">
            {analysis.keywords.map((keyword) => (
              <li key={keyword}>{keyword}</li>
            ))}
          </ul>
        ) : (
          <p className="muted">Brak danych</p>
        )}
      </section>

      <section className="card">
        <div className="results__header">
          <h3>Podgląd JSON</h3>
          <div className="actions">
            <button
              type="button"
              className="button button--secondary"
              aria-expanded={showJson}
              onClick={() => setShowJson((value) => !value)}
            >
              {showJson ? 'Ukryj' : 'Pokaż'}
            </button>
            <button type="button" className="button button--secondary" onClick={copy}>
              {copied ? 'Skopiowano' : 'Kopiuj'}
            </button>
          </div>
        </div>
        {showJson ? (
          <pre className="json" tabIndex={0}>
            <code>{json}</code>
          </pre>
        ) : null}
      </section>
    </div>
  );
}
