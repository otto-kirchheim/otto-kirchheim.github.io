import type { FeaturePdfContext } from '@/shared/lib/feature';
import calculateBuchungstagEwt from '@/features/EWT/utils/calculateBuchungstagEwt';
import dayjs from '@/shared/lib/date/configDayjs';
import { isEwtInMonat } from '@/shared/lib/date/getMonatFromItem';
import tableToArray from '@/shared/lib/ressource/tableToArray';
import { tableIdOf } from '@/shared/lib/ressource/resourceConfig';
import { alsMinuten, FORMAT, ZEILEN_OPS } from '@/infrastructure/pdf/aggregatoren';
import type { IDatenEWT } from '@/types';

export interface IPdfEWT {
  Buchungstag: string;
  Einsatzort: string;
  Schicht: string;
  abWE?: string;
  ab1E?: string;
  anEE?: string;
  beginE?: string;
  endeE?: string;
  abEE?: string;
  an1E?: string;
  anWE?: string;
  berechnen: boolean;
  // Vorberechnete Werte, erst durch `ewtAbgeleiteteWerte()` (`features/EWT/utils/pdfDaten.ts`) berechnet,
  // deshalb optional statt vom Typsystem erzwungen. Renderer-seitig immer vorhanden, sobald
  // `ewtAbgeleiteteWerte()` durchgelaufen ist.
  DauerWohnung?: string;
  DauerErsteTkgSt?: string;
  Wohnung8bis14?: boolean;
  Wohnung14bis24?: boolean;
  WohnungUeber24?: boolean;
  BeamterUeber8Wohnung?: boolean;
  TkgSt8bis24?: boolean;
  TkgStUeber24?: boolean;
}

export type IEwtPdfBody = {
  Daten: {
    EWT: IPdfEWT[];
  };
};

const STUNDE = 60;

/**
 * Dauer zwischen zwei `"HH:mm"`-Zeiten in Minuten (Mitternacht-Wrap via `zeitdifferenz`). Ohne einen der
 * Werte gibt es keine Dauer -- eine Differenz gegen `0` täuschte sonst eine Zeitspanne vor.
 *
 * @param ende - Endzeit `"HH:mm"`.
 * @param beginn - Startzeit `"HH:mm"`.
 * @returns Dauer in Minuten; `0`, wenn einer der Werte fehlt.
 */
function dauerMinuten(ende: string | undefined, beginn: string | undefined): number {
  if (!ende || !beginn) return 0;
  return ZEILEN_OPS.zeitdifferenz([alsMinuten(ende), alsMinuten(beginn)]);
}

export interface EwtAbgeleiteteWerte {
  DauerWohnung: string;
  DauerErsteTkgSt: string;
  Wohnung8bis14: boolean;
  Wohnung14bis24: boolean;
  WohnungUeber24: boolean;
  BeamterUeber8Wohnung: boolean;
  TkgSt8bis24: boolean;
  TkgStUeber24: boolean;
}

/**
 * Vorberechnete Zeiten/Ankreuzfelder einer EWT-Zeile. `beamter` (= `VorgabenU.Pers.TB !== 'Tarifkraft'`)
 * kommt nicht aus der Zeile; `BeamterUeber8Wohnung` ist der einzige feldübergreifende Fall.
 *
 * Die Boolean-Felder im Editor über `Bedingung.bereich: { von: 1, bis: 2 }` als Ankreuz-Quelle
 * verwenden, nicht über `werte` (nur für `string`-Auswahl gebaut); `alsVergleichswert` macht `true`/`false`
 * zu `1`/`0`.
 *
 * `WohnungUeber24`/`TkgStUeber24` sind mit den reinen Uhrzeit-Feldern nie erreichbar (höchstens ein
 * Mitternachtswechsel, Gesamtspanne auf 20h gedeckelt), aber symmetrisch zu den anderen Bändern gebaut.
 *
 * @param zeile - EWT-Zeile mit Wohnung- (`abWE`/`anWE`) und erster TkgSt-Zeit (`ab1E`/`an1E`).
 * @param beamter - `true` für Beamte (`TB !== 'Tarifkraft'`).
 * @returns Dauern als Text sowie die Ankreuzfelder der Zeitbänder.
 */
export function ewtAbgeleiteteWerte(
  zeile: Pick<IPdfEWT, 'abWE' | 'anWE' | 'ab1E' | 'an1E'>,
  beamter: boolean,
): EwtAbgeleiteteWerte {
  const dauerWohnung = dauerMinuten(zeile.anWE, zeile.abWE);
  const dauerErsteTkgSt = dauerMinuten(zeile.an1E, zeile.ab1E);

  return {
    DauerWohnung: FORMAT.stunden(dauerWohnung),
    DauerErsteTkgSt: FORMAT.stunden(dauerErsteTkgSt),
    Wohnung8bis14: dauerWohnung > 8 * STUNDE && dauerWohnung <= 14 * STUNDE,
    Wohnung14bis24: dauerWohnung > 14 * STUNDE && dauerWohnung <= 24 * STUNDE,
    WohnungUeber24: dauerWohnung > 24 * STUNDE,
    BeamterUeber8Wohnung: beamter && dauerWohnung > 8 * STUNDE,
    TkgSt8bis24: dauerErsteTkgSt > 8 * STUNDE && dauerErsteTkgSt <= 24 * STUNDE,
    TkgStUeber24: dauerErsteTkgSt > 24 * STUNDE,
  };
}

/**
 * Bildet die Schichtkuerzel `SP` und `BN` auf `T` bzw. `N` ab (Kuerzel der PDF-Vorlage).
 *
 * @param schicht - Schichtkuerzel der Tabelle.
 * @returns Kuerzel fuer den Druck; unbekannte bleiben unveraendert.
 */
function normalizeEwtSchichtForDownload(schicht: string): string {
  if (schicht === 'SP') return 'T';
  if (schicht === 'BN') return 'N';
  return schicht;
}

/**
 * Baut die PDF-Daten der EWT aus der Tabelle des Exportmonats (nach Buchungstag) inklusive vorberechneter Dauern und Zeitband-Haekchen.
 *
 * @param context - Exportmonat, persoenliche Vorgaben u. a. (`FeaturePdfContext`).
 * @returns `Daten.EWT` in der Form der Vorlagen-Pipeline.
 */
export function baueEwtPdfDaten({ monat, vorgabenU }: FeaturePdfContext): { Daten: IEwtPdfBody['Daten'] } {
  const ewtRaw = tableToArray<IDatenEWT<string>>(tableIdOf('EWT')).filter(e => isEwtInMonat(e, monat, 'buchungstag'));
  // Beamter = TB !== 'Tarifkraft' (Konvention wie in calculateBerechnungRows.ts); Grundlage für
  // `BeamterUeber8Wohnung`, den einzigen feldübergreifenden Fall in `ewtAbgeleiteteWerte()`.
  const beamter = vorgabenU.Pers.TB !== 'Tarifkraft';
  // Die Einsatzort-Auswahl speichert nur die Tätigkeitsstätte (`Fahrzeit[].key`); für den Druck
  // wird die Beschreibung (`Fahrzeit[].text`) angehängt.
  const einsatzortBeschreibung = new Map(vorgabenU.Fahrzeit.map(fz => [fz.key, fz.text]));
  return {
    Daten: {
      EWT: ewtRaw.map(e => {
        const basis = {
          Buchungstag: dayjs(e.Buchungstag || calculateBuchungstagEwt(e)).format('DD'),
          Einsatzort: [e.Einsatzort, einsatzortBeschreibung.get(e.Einsatzort)].filter(Boolean).join(' | '),
          Schicht: normalizeEwtSchichtForDownload(e.Schicht),
          abWE: e.abWE ? dayjs(e.abWE, 'HH:mm').format('HH:mm') : undefined,
          ab1E: e.ab1E ? dayjs(e.ab1E, 'HH:mm').format('HH:mm') : undefined,
          anEE: e.anEE ? dayjs(e.anEE, 'HH:mm').format('HH:mm') : undefined,
          beginE: e.beginE ? dayjs(e.beginE, 'HH:mm').format('HH:mm') : undefined,
          endeE: e.endeE ? dayjs(e.endeE, 'HH:mm').format('HH:mm') : undefined,
          abEE: e.abEE ? dayjs(e.abEE, 'HH:mm').format('HH:mm') : undefined,
          an1E: e.an1E ? dayjs(e.an1E, 'HH:mm').format('HH:mm') : undefined,
          anWE: e.anWE ? dayjs(e.anWE, 'HH:mm').format('HH:mm') : undefined,
          berechnen: e.berechnen,
        };
        // Vorberechnete Dauer-/Zeitband-Felder stehen mit im Zeilenobjekt, `build()` liest sie als
        // normale Datenpfade (Daten.EWT[].DauerWohnung etc.).
        return { ...basis, ...ewtAbgeleiteteWerte(basis, beamter) };
      }),
    },
  };
}
