interface Props {
  message: string;
  onRetry: (() => void) | null;
  onReset: () => void;
}

export function ErrorBox({ message, onRetry, onReset }: Props) {
  return (
    <div className="error" role="alert">
      <p className="error__message">{message}</p>
      <div className="actions">
        {onRetry ? (
          <button type="button" className="button" onClick={onRetry}>
            Spróbuj ponownie
          </button>
        ) : null}
        <button type="button" className="button button--secondary" onClick={onReset}>
          Wybierz inny plik
        </button>
      </div>
    </div>
  );
}
