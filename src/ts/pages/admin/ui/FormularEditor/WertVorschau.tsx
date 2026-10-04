/**
 * Gerenderter Beispielwert unter einem Eintrag; leere Werte werden als solche kenntlich gemacht.
 *
 * @param props - `text` ist der anzuzeigende Wert.
 */
export function WertVorschau({ text }: { text: string }) {
  return (
    <div className="zelle-klein farbe-gedaempft ohne-luft-unten">
      Vorschau:{' '}
      {text === '' ? <em className="farbe-gedaempft">(leer)</em> : <span className="schrift-mono">{text}</span>}
    </div>
  );
}
