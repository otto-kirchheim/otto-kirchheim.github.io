import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { Abschnitt, KlappZeile } from '@/features/Admin/components/FormularEditor/feldPanelGemeinsam';

describe('KlappZeile / Abschnitt', () => {
  it('KlappZeile: offen erzwingt das open-Attribut, sonst bleibt es weg (Nutzer steuert)', () => {
    const offen = renderToStaticMarkup(
      <KlappZeile titel="Feld A" offen>
        <p>Körper</p>
      </KlappZeile>,
    );
    expect(offen).toContain('<details');
    expect(offen).toContain('open=""');

    const zu = renderToStaticMarkup(
      <KlappZeile titel="Feld A" offen={false}>
        <p>Körper</p>
      </KlappZeile>,
    );
    expect(zu).not.toContain('open=""');
  });

  it('KlappZeile: Titel und Aktionen landen in der summary, der Körper dahinter', () => {
    const html = renderToStaticMarkup(
      <KlappZeile titel="Spalte X" aktionen={<button type="button">löschen</button>}>
        <p>Editor</p>
      </KlappZeile>,
    );
    expect(html).toContain('<summary');
    expect(html).toContain('Spalte X');
    expect(html).toContain('löschen');
    expect(html).toContain('Editor');
    // Aktionen-Wrapper unterdrückt das Umklappen (preventDefault) -- ohne den würde jeder Knopf toggeln.
    expect(html).toMatch(/<span[^>]*role="presentation"/);
  });

  it('Abschnitt: zusatz erscheint neben dem Titel', () => {
    const html = renderToStaticMarkup(
      <Abschnitt titel="Felder" zusatz={<span>7</span>} offen>
        <p>Liste</p>
      </Abschnitt>,
    );
    expect(html).toContain('Felder');
    expect(html).toContain('<span>7</span>');
    expect(html).toContain('open=""');
  });
});
