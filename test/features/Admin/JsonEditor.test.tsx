import { describe, expect, it } from 'bun:test';
import { render } from 'preact';
import { JsonEditor } from '@/features/Admin/components/JsonEditor';

async function flush(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0));
}

function renderEditor(props: Partial<Parameters<typeof JsonEditor>[0]> = {}): HTMLDivElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  render(<JsonEditor value={props.value ?? '{}'} onChange={props.onChange ?? (() => {})} {...props} />, container);
  return container;
}

function header(container: HTMLDivElement): HTMLDivElement {
  return container.querySelector('.d-flex.align-items-center.gap-2') as HTMLDivElement;
}

function badge(container: HTMLDivElement): HTMLSpanElement | null {
  return container.querySelector('.badge');
}

async function click(el: Element): Promise<void> {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await flush();
}

describe('JsonEditor', () => {
  describe('buildSummary (via gerendertem Badge)', () => {
    it('zeigt "Array [n]" mit Vorschau des ersten Elements', () => {
      const container = renderEditor({ value: '[1, 2, 3]' });
      expect(badge(container)?.textContent).toBe('Array [3]');
      expect(container.textContent).toContain('1');
    });

    it('zeigt "—" als Hint bei leerem Array', () => {
      const container = renderEditor({ value: '[]' });
      expect(badge(container)?.textContent).toBe('Array [0]');
      expect(container.textContent).toContain('—');
    });

    it('zeigt "Objekt {n}" mit den ersten drei Schlüsseln', () => {
      const container = renderEditor({ value: '{"a":1,"b":2,"c":3,"d":4}' });
      expect(badge(container)?.textContent).toBe('Objekt {4}');
      expect(container.textContent).toContain('a, b, c, …');
    });

    it('zeigt einen primitiven Wert ohne Hint', () => {
      const container = renderEditor({ value: '42' });
      expect(badge(container)?.textContent).toBe('42');
    });

    it('zeigt "Ungültiges JSON" bei kaputtem JSON', () => {
      const container = renderEditor({ value: '{kaputt' });
      expect(badge(container)?.textContent).toBe('Ungültiges JSON');
      expect(badge(container)?.className).toContain('bg-danger');
    });
  });

  describe('Auf-/Zuklappen', () => {
    it('klappt beim Klick auf die Kopfzeile auf und zeigt die Textarea', async () => {
      const container = renderEditor({ value: '{}' });
      expect(container.querySelector('textarea')).toBeNull();

      await click(header(container));

      expect(container.querySelector('textarea')).not.toBeNull();
    });

    it('klappt beim erneuten Klick wieder zu', async () => {
      const container = renderEditor({ value: '{}' });
      await click(header(container));
      await click(header(container));

      expect(container.querySelector('textarea')).toBeNull();
    });
  });

  describe('Fehleranzeige', () => {
    it('markiert den Rahmen rot, wenn error gesetzt ist, auch bei validem JSON', () => {
      const container = renderEditor({ value: '{}', error: 'Server-Validierungsfehler' });
      expect(container.querySelector('.border-danger')).not.toBeNull();
    });

    it('zeigt die Fehlermeldung im geöffneten Zustand', async () => {
      const container = renderEditor({ value: '{}', error: 'Server-Validierungsfehler' });
      await click(header(container));

      expect(container.textContent).toContain('Server-Validierungsfehler');
    });

    it('fällt auf "Ungültiges JSON" zurück, wenn kein error-Prop aber ungültiges JSON vorliegt', async () => {
      const container = renderEditor({ value: '{kaputt' });
      await click(header(container));

      const errorDiv = Array.from(container.querySelectorAll('.text-danger')).find(el =>
        el.textContent?.includes('Ungültiges JSON'),
      );
      expect(errorDiv).toBeDefined();
    });
  });

  describe('Format-Button', () => {
    it('formatiert gültiges JSON mit Einrückung', async () => {
      let current = '{"a":1}';
      const container = renderEditor({
        value: current,
        onChange: v => {
          current = v;
        },
      });
      await click(header(container));

      const formatButton = Array.from(container.querySelectorAll('button')).find(b =>
        b.textContent?.includes('Format'),
      ) as HTMLButtonElement;
      await click(formatButton);

      expect(current).toBe(JSON.stringify({ a: 1 }, null, 2));
    });

    it('tut nichts bei ungültigem JSON', async () => {
      const onChange = () => {
        throw new Error('onChange sollte nicht aufgerufen werden');
      };
      const container = renderEditor({ value: '{kaputt', onChange });
      await click(header(container));

      const formatButton = Array.from(container.querySelectorAll('button')).find(b =>
        b.textContent?.includes('Format'),
      ) as HTMLButtonElement;
      expect(() => formatButton.click()).not.toThrow();
    });

    it('stoppt die Klick-Propagation, damit der Header nicht mitschließt', async () => {
      const container = renderEditor({ value: '{}' });
      await click(header(container));
      expect(container.querySelector('textarea')).not.toBeNull();

      const formatButton = Array.from(container.querySelectorAll('button')).find(b =>
        b.textContent?.includes('Format'),
      ) as HTMLButtonElement;
      await click(formatButton);

      expect(container.querySelector('textarea')).not.toBeNull();
    });
  });

  describe('Textarea-Eingabe', () => {
    it('ruft onChange mit dem neuen Rohtext auf', async () => {
      let current = '{}';
      const container = renderEditor({
        value: current,
        onChange: v => {
          current = v;
        },
      });
      await click(header(container));

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      textarea.value = '{"neu": true}';
      textarea.dispatchEvent(new Event('input', { bubbles: true }));

      expect(current).toBe('{"neu": true}');
    });

    it('passt die Zeilenzahl an den Inhalt an (min 5, max 24)', async () => {
      const container = renderEditor({ value: 'zeile1\nzeile2\nzeile3' });
      await click(header(container));

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      expect(Number(textarea.rows)).toBe(5);
    });

    it('begrenzt die Zeilenzahl auf 24 bei sehr langem Inhalt', async () => {
      const longValue = Array.from({ length: 40 }, (_, i) => `zeile${i}`).join('\n');
      const container = renderEditor({ value: longValue });
      await click(header(container));

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      expect(Number(textarea.rows)).toBe(24);
    });
  });
});
