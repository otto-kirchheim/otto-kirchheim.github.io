/** Gerenderter Beispielwert unter einem Eintrag; leere Werte werden als solche kenntlich gemacht. */
export function WertVorschau({ text }: { text: string }) {
  return (
    <div class="form-text small mb-0">
      Vorschau: {text === '' ? <em class="text-body-secondary">(leer)</em> : <span class="font-monospace">{text}</span>}
    </div>
  );
}
