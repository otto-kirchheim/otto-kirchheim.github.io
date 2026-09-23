/**
 * Gerenderter Beispielwert unter einem Eintrag; leere Werte werden als solche kenntlich gemacht.
 *
 * @param props - `text` ist der anzuzeigende Wert.
 */
export function WertVorschau({ text }: { text: string }) {
  return (
    <div className="small text-body-secondary mb-0">
      Vorschau:{' '}
      {text === '' ? <em className="text-body-secondary">(leer)</em> : <span className="font-monospace">{text}</span>}
    </div>
  );
}
