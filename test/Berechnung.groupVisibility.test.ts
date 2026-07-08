import { beforeEach, describe, expect, it } from 'bun:test';
import { VorgabenGeldMock, VorgabenUMock } from './mockData';
import Storage from '@/infrastructure/storage/Storage';
import generateTableBerechnung from '@/features/Berechnung/generateTableBerechnung';
import { isGroupVisible } from '@/features/Berechnung/berechnungGroupVisibility';
import type { IVorgabenBerechnung, IVorgabenU } from '@/types';

const monatOhneNeben = {
  B: { B: 6000, L1: 1, L2: 0, L3: 0, K: 0 },
  E: { A8: 2, A14: 0, A24: 0, S8: 0, S14: 0 },
  N: { F: 0, A: 0, B: 0, C: 0, CA: 0, CB: 0, C9: 0, SIPO: 0 },
};

const monatMitNeben = {
  ...monatOhneNeben,
  N: { ...monatOhneNeben.N, F: 2 },
};

function setupDom(): void {
  document.body.innerHTML =
    '<table class="table-Berechnung"><thead><tr><th></th></tr></thead>' +
    '<tbody id="tbodyBerechnung"></tbody></table>';
}

function setVorgabenU(aktivierteTabs: string[]): void {
  const vorgabenU: IVorgabenU = {
    ...VorgabenUMock,
    Einstellungen: { ...VorgabenUMock.Einstellungen, aktivierteTabs },
  };
  Storage.set('VorgabenU', vorgabenU);
}

describe('#isGroupVisible', () => {
  it('zeigt alles ohne Einschränkung (leer/undefined)', () => {
    expect(isGroupVisible('neben', [], false)).toBe(true);
    expect(isGroupVisible('neben', undefined, false)).toBe(true);
  });

  it('zeigt global aktivierte Gruppen unabhängig von Daten', () => {
    expect(isGroupVisible('neben', ['neben'], false)).toBe(true);
  });

  it('blendet deaktivierte Gruppen ohne Daten aus, zeigt sie mit Daten (Ausnahme)', () => {
    expect(isGroupVisible('neben', ['bereitschaft', 'ewt'], false)).toBe(false);
    expect(isGroupVisible('neben', ['bereitschaft', 'ewt'], true)).toBe(true);
  });
});

describe('#generateTableBerechnung Gruppen-Sichtbarkeit (Jahres-Scope)', () => {
  beforeEach(() => {
    setupDom();
    Storage.set('VorgabenGeld', VorgabenGeldMock);
  });

  it('entfernt die Nebenbezüge-Zeile, wenn deaktiviert und ganzjährig ohne Daten', () => {
    setVorgabenU(['bereitschaft', 'ewt']);

    generateTableBerechnung({ 1: monatOhneNeben, 2: monatOhneNeben } as unknown as IVorgabenBerechnung);

    const tbody = document.querySelector<HTMLTableSectionElement>('#tbodyBerechnung');
    expect(tbody?.children.length).toBe(12);
    expect(tbody?.textContent).not.toContain('Summe Nebenbezüge');
    expect(tbody?.textContent).toContain('Summe Gesamt');
  });

  it('zeigt die Nebenbezüge-Zeile trotz Deaktivierung, wenn ein Monat Daten hat', () => {
    setVorgabenU(['bereitschaft', 'ewt']);

    generateTableBerechnung({ 1: monatOhneNeben, 2: monatMitNeben } as unknown as IVorgabenBerechnung);

    const tbody = document.querySelector<HTMLTableSectionElement>('#tbodyBerechnung');
    expect(tbody?.children.length).toBe(13);
    expect(tbody?.textContent).toContain('Summe Nebenbezüge');
  });

  it('zeigt alle 13 Zeilen, wenn keine Einschränkung gesetzt ist', () => {
    setVorgabenU([]);

    generateTableBerechnung({ 1: monatOhneNeben } as unknown as IVorgabenBerechnung);

    const tbody = document.querySelector<HTMLTableSectionElement>('#tbodyBerechnung');
    expect(tbody?.children.length).toBe(13);
  });

  it('fügt bei mehreren Jahres-Zulagen eine Aufschlüsselungszeile vor Summe Nebenbezüge ein', () => {
    setVorgabenU([]);
    Storage.set('Benutzer', 'testuser');
    Storage.set('Jahr', 2026);
    Storage.set('dataN', [
      { tagN: '05.01.2026', beginN: '08:00', endeN: '16:00', auftragN: 'A1', zulagenN: [{ code: '040', value: 2 }] },
      { tagN: '10.03.2026', beginN: '08:00', endeN: '16:00', auftragN: 'A1', zulagenN: [{ code: '846', value: 120 }] },
    ]);

    generateTableBerechnung({ 1: monatMitNeben, 2: monatOhneNeben } as unknown as IVorgabenBerechnung);

    const tbody = document.querySelector<HTMLTableSectionElement>('#tbodyBerechnung');
    expect(tbody?.children.length).toBe(14);
    expect(tbody?.textContent).toContain('040 Fahrentsch.');
    expect(tbody?.textContent).toContain('846 kein SiPo');

    // Breakdown-Zeile = vorletzte Zeile (vor Summe Nebenbezüge ... Summe Gesamt)
    const breakdownRow = Array.from(tbody!.children).find(row => row.textContent?.includes('040 Fahrentsch.'))!;
    const zellen = breakdownRow.querySelectorAll(':scope > td');
    // Januar hat Zulagen (040: 2) → gestapelte Werte; Februar ohne Zulagen → leere Zelle
    expect(zellen[0].innerHTML).toContain('2');
    expect(zellen[1].innerHTML).toBe('');

    Storage.set('dataN', []);
  });

  it('entfernt mehrere deaktivierte Gruppen ohne Daten gemeinsam', () => {
    setVorgabenU(['bereitschaft']);

    const monatNurBereitschaft = {
      B: { B: 6000, L1: 0, L2: 0, L3: 0, K: 0 },
      E: { A8: 0, A14: 0, A24: 0, S8: 0, S14: 0 },
      N: { F: 0, A: 0, B: 0, C: 0, CA: 0, CB: 0, C9: 0, SIPO: 0 },
    };

    generateTableBerechnung({ 1: monatNurBereitschaft } as unknown as IVorgabenBerechnung);

    const tbody = document.querySelector<HTMLTableSectionElement>('#tbodyBerechnung');
    // 13 - 3 (ewt) - 1 (neben) = 9 Zeilen
    expect(tbody?.children.length).toBe(9);
    expect(tbody?.textContent).not.toContain('Summe EWT');
    expect(tbody?.textContent).not.toContain('Summe Nebenbezüge');
    expect(tbody?.textContent).toContain('Summe Bereitschaft');
    expect(tbody?.textContent).toContain('Summe Gesamt');
  });
});
