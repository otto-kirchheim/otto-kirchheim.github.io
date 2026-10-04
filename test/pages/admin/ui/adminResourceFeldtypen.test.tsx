import { afterEach, describe, expect, it } from 'bun:test';

import type { AdminResourceConfig } from '@/pages/admin/adminFeatures';
import berAdmin from '@/pages/admin/features/ber';
import eaAdmin from '@/pages/admin/features/ea';
import ewtAdmin from '@/pages/admin/features/ewt';
import ezAdmin from '@/pages/admin/features/ez';
import { AdminResourceEditModal } from '@/pages/admin/ui/AdminResourceEditModal';
import { formatCell, formatDateTime, type EditState } from '@/pages/admin/ui/adminResourceBrowserGemeinsam';
import { render } from '@test/reactRender';

/** Ressourcen-Konfiguration je `shortLabel` aus den Admin-Anteilen. */
const RESSOURCEN = Object.fromEntries(
  [berAdmin, ewtAdmin, ezAdmin, eaAdmin].flatMap(feature => feature.resources).map(r => [r.shortLabel, r]),
) as Record<string, AdminResourceConfig>;

const ISO = '2026-09-03T00:00:00.000Z';

describe('Admin-Ressourcenbrowser: Feldtypen aus den Admin-Anteilen', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('jede Ressource meldet ihre reinen Datums- und Zeitfelder (bisherige globale Listen)', () => {
    const typen = Object.fromEntries(
      Object.entries(RESSOURCEN).map(([kurz, r]) => [kurz, [r.nurDatumFelder ?? [], r.zeitFelder ?? []]]),
    );
    expect(typen).toEqual({
      BE: [['Tag'], ['Beginn', 'Ende']],
      BZ: [[], []],
      EWT: [
        ['Tag', 'Buchungstag'],
        ['abWE', 'ab1E', 'anEE', 'beginE', 'endeE', 'abEE', 'an1E', 'anWE'],
      ],
      NG: [['Tag'], ['Beginn', 'Ende']],
      EA: [['Tag'], ['Dauer']],
    });
  });

  it('formatCell: reines Datumsfeld ohne Uhrzeit, sonst Datum mit Uhrzeit', () => {
    expect(formatCell(RESSOURCEN.EWT, 'Buchungstag', ISO)).toBe('03.09.2026');
    expect(formatCell(RESSOURCEN.EWT, 'createdAt', ISO)).toBe(formatDateTime(ISO));
    // BZ.Beginn ist ein Date -- ohne Eintrag in `nurDatumFelder` mit Uhrzeit.
    expect(formatCell(RESSOURCEN.BZ, 'Beginn', ISO)).toBe(formatDateTime(ISO));
  });

  it('Editor: Eingabetyp je Feld aus der Ressource (date, time, datetime-local; unbekannte Zeit als Text)', async () => {
    const edit = (values: Record<string, unknown>): EditState => ({
      doc: { _id: 'x', ...values },
      values,
      rawStrings: {},
      jsonErrors: {},
      saving: false,
      saveError: null,
    });
    const typenVon = async (resource: AdminResourceConfig, values: Record<string, unknown>) => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      render(
        <AdminResourceEditModal
          edit={edit(values)}
          resource={resource}
          userNameMap={{}}
          closeEdit={() => undefined}
          saveEdit={() => undefined}
          handleValueChange={() => undefined}
          handleTextareaChange={() => undefined}
          navigateToEntry={() => undefined}
        />,
        container,
      );
      await new Promise(resolve => setTimeout(resolve, 0));
      const typen = [...document.body.querySelectorAll<HTMLInputElement>('input')].map(input => input.type);
      render(null, container);
      return typen;
    };

    expect(await typenVon(RESSOURCEN.EWT, { Tag: ISO, beginE: '08:00', Zeitpunkt: ISO })).toEqual([
      'date',
      'time',
      'datetime-local',
    ]);
    // Ohne Eintrag in `zeitFelder` ist "HH:mm" normaler Text.
    expect(await typenVon(RESSOURCEN.BZ, { Pause: '08:00' })).toEqual(['text']);
  });
});
