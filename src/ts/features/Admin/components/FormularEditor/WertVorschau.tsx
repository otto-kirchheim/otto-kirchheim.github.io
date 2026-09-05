/** Gerenderter Beispielwert unter einem Eintrag; leere Werte werden als solche kenntlich gemacht. */
export function WertVorschau({ text }: { text: string }) {
  return (
    <div className="form-text small mb-0">
      Vorschau:{' '}
      {text === '' ? <em className="text-body-secondary">(leer)</em> : <span className="font-monospace">{text}</span>}
    </div>
  );
}
