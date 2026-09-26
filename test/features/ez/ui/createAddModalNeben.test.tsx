import { afterEach, beforeEach, describe, expect, it, vi } from 'bun:test';

import type { CustomTable } from '@/shared/ui/custom-table/CustomTable';
import { ezMeta } from '@/features/ez/meta';
import { ewtMeta } from '@/features/ewt/meta';
import { featureLifecycleRegistry, featureRegistry } from '@/shared/lib/feature';
import createAddModalNeben from '@/features/ez/ui/createAddModalNeben';
import type { IDatenN } from '@/types';

function tableMitAddRow() {
  const addRow = vi.fn();
  const table = { options: { editing: { addRow } } } as unknown as CustomTable<IDatenN>;
  return { table, addRow };
}

describe('createAddModalNeben ohne Modul ewt', () => {
  beforeEach(() => {
    featureRegistry.clear();
    featureLifecycleRegistry.clearAll();
  });
  afterEach(() => {
    featureRegistry.clear();
    featureLifecycleRegistry.clearAll();
  });

  it('oeffnet direkt die manuelle Eingabe statt der Tag-Schnellauswahl', () => {
    featureRegistry.define({ meta: ezMeta, parts: {} });
    const { table, addRow } = tableMitAddRow();

    createAddModalNeben(table);

    expect(addRow).toHaveBeenCalledTimes(1);
  });

  it('mit ewt aber ohne Tage im Monat: weiter Fehler mit Hinweis (Schnellauswahl bleibt der Normalweg)', () => {
    localStorage.clear();
    featureRegistry.define({ meta: ewtMeta, parts: {} });
    featureRegistry.define({ meta: ezMeta, parts: {} });
    const { table, addRow } = tableMitAddRow();

    expect(() => createAddModalNeben(table)).toThrow('Keine Tage im aktuellen Monat in EWT gefunden.');
    expect(addRow).not.toHaveBeenCalled();
  });
});
