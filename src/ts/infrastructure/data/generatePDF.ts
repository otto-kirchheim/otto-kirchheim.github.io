import { saveAs } from 'file-saver';
import Storage from '../storage/Storage';
import buttonDisable from '../ui/buttonDisable';
import clearLoading from '../ui/clearLoading';
import setLoading from '../ui/setLoading';
import { createSnackBar } from '../ui/CustomSnackbar';
import type {
  IDatenBE,
  IDatenBZ,
  IDatenEA,
  IDatenEWT,
  IDatenN,
  IVorgabenGeld,
  IVorgabenGeldType,
  IVorgabenU,
} from '@/types';
import type {
  IBereitschaftszeitraumPdfBody,
  IEntgeltausgleichPdfBody,
  IEwtPdfBody,
  INebengeldPdfBody,
} from '../pdf/pdfDaten';
import {
  beAbgeleiteteWerte,
  bereitschaftszulageAbgeleiteteWerte,
  bzAbgeleiteteWerte,
  ewtAbgeleiteteWerte,
  ezAbgeleiteteWerte,
} from '../pdf/abgeleiteteWerte';
import tableToArray from './tableToArray';
import dayjs from '../date/configDayjs';
import { splitOeInput } from './oeLevels';
import { ladeUndErzeugePdf } from '../pdf/ladeFormular';
import { signaturDialog } from '../pdf/signaturDialog';
import {
  filterByMonat,
  getMonatFromBE,
  getMonatFromBZ,
  getMonatFromEA,
  getMonatFromN,
  isEwtInMonat,
} from '../date/getMonatFromItem';
import calculateBuchungstagEwt from '../date/calculateBuchungstagEwt';

/**
 * Erzeugt das PDF eines Formulars aus den Tabellendaten des aktuellen Monats und laedt es herunter.
 * Bricht ohne Button oder offline still ab; Fehler erscheinen als Snackbar, Button-Sperre und
 * Ladeanzeige werden am Ende immer zurueckgesetzt.
 *
 * @param button - Ausloesender Button (Id fuer die Ladeanzeige); bei `null` passiert nichts.
 * @param modus - Formular: `B` Bereitschaft, `E` EWT, `N` Nebengeld, `EA` Entgeltausgleich.
 * @throws {Error} Bei unbekanntem `modus` ('Modus fehlt').
 */
export default async function generatePDF(
  button: HTMLButtonElement | null,
  modus: 'B' | 'E' | 'N' | 'EA',
): Promise<void> {
  if (button === null) return;

  // Kein eigener Offline-Hinweis: `setOffline.ts` zeigt solange `navigator.onLine === false` eine dauerhafte Snackbar.
  if (!navigator.onLine) return;

  setLoading(button.id);
  buttonDisable(true);

  const VorgabenGeldDaten: IVorgabenGeld = Storage.get('VorgabenGeld', { check: true });
  const VorgabenGeldHandler: ProxyHandler<IVorgabenGeld> = {
    /**
     * Liefert die Geld-Vorgaben eines Monats: Monat 1 als Basis, darueber die Aenderungen der
     * Monate 2 bis `prop` in aufsteigender Reihenfolge.
     *
     * @param target - Vorgaben je Monat (nur Aenderungen ab Monat 2).
     * @param prop - Monatsnummer als Property-Name.
     * @returns Zusammengefuehrte Vorgaben fuer den Monat.
     */
    get: (target: IVorgabenGeld, prop: string): IVorgabenGeldType => {
      const maxMonat: number = Number(prop);
      let returnObjekt = target[1];
      const keys = Object.keys(target).map(Number);
      if (keys.length > 1 && maxMonat > 1 && Math.max(...keys.filter(key => key <= maxMonat)) > 1)
        for (let monat = 2; monat <= maxMonat; monat++)
          if (typeof target[monat] !== 'undefined') returnObjekt = { ...returnObjekt, ...target[monat] };
      return returnObjekt;
    },
    /**
     * Verbietet Schreibzugriffe auf die Vorgaben.
     *
     * @param _target - Vorgaben (ungenutzt).
     * @param prop - Property-Name.
     * @param newValue - Versuchter Wert.
     * @returns Immer `false`.
     */
    set: (_target: IVorgabenGeld, prop: string, newValue) => {
      console.log('veränderung von datenGeld nicht erlaubt:', prop, newValue);
      return false;
    },
  };
  const VorgabenGeld = new Proxy(VorgabenGeldDaten, VorgabenGeldHandler);

  const Monat = Storage.get<number>('Monat', { check: true });
  const Jahr = Storage.get<number>('Jahr', { check: true });
  const localVorgabenU = Storage.get<IVorgabenU>('VorgabenU', { check: true });
  // `Pers.OE` ist im Profil ein Freitextfeld (`"V.IW-MI-N-KSL-IL 03"`), die PDF-Vorlagen-Pipeline
  // (`datenKatalog.ts`/`wert.ts`, `FORMAT.oe`) erwartet ein Ebenen-Array.
  const pers = { ...localVorgabenU.Pers, OE: splitOeInput(localVorgabenU.Pers.OE) };

  const data: Record<string, unknown> = {
    // `Name` ist kein Profil-Feld (`IPers`), sondern nur Druckkomfort und wird hier zusammengesetzt.
    VorgabenU: {
      Pers: { ...pers, Name: `${pers.Nachname}, ${pers.Vorname}` },
      Fahrzeit: localVorgabenU.Fahrzeit,
    },
    VorgabenGeld: VorgabenGeld[Monat],
    Monat,
    Jahr,
  };

  /**
   * Bildet die Schichtkuerzel `SP` und `BN` auf `T` bzw. `N` ab (Kuerzel der PDF-Vorlage).
   *
   * @param schicht - Schichtkuerzel der Tabelle.
   * @returns Kuerzel fuer den Druck; unbekannte bleiben unveraendert.
   */
  const normalizeEwtSchichtForDownload = (schicht: string): string => {
    if (schicht === 'SP') return 'T';
    if (schicht === 'BN') return 'N';
    return schicht;
  };

  // Daten: CustomTable-Zeilen → kanonisches PDF-Daten-Format (datenKatalog.ts/wert.ts)
  switch (modus) {
    case 'B': {
      const bzRaw = filterByMonat(tableToArray<IDatenBZ<string>>('tableBZ'), Monat, getMonatFromBZ);
      const beRaw = filterByMonat(tableToArray<IDatenBE>('tableBE'), Monat, getMonatFromBE);
      // Beamter = TB !== 'Tarifkraft' (Konvention wie in calculateBerechnungRows.ts); bestimmt den
      // Privat-km-Satz (`PrivatPKWBeamter`/`PrivatPKWTarif`) fuer beAbgeleiteteWerte().
      const beamter = localVorgabenU.Pers.TB !== 'Tarifkraft';
      const geldMonatB = VorgabenGeld[Monat];
      const privatKmSatz = beamter ? geldMonatB.PrivatPKWBeamter : geldMonatB.PrivatPKWTarif;
      // Vorberechnete `Dauer`/`PrivatKmBetrag` stehen mit im Zeilenobjekt, `build()` liest sie als
      // normale Datenpfade (Daten.BZ[].Dauer, Daten.BE[].Dauer/PrivatKmBetrag). Eigene Variablen,
      // weil dieselben Zeilen unten fuer die Bereitschaftszulage summiert werden.
      const bzMitDauer = bzRaw.map(bz => {
        // 0-Pause bewusst als `undefined` -- die Spalte bleibt leer statt „0" zu drucken;
        // `bzAbgeleiteteWerte()` deckelt intern mit `?? 0`, die Dauer bleibt korrekt.
        const basis = { Beginn: bz.Beginn, Ende: bz.Ende, Pause: bz.Pause || undefined };
        return { ...basis, ...bzAbgeleiteteWerte(basis) };
      });
      const beMitDauer = beRaw.map(be => {
        const basis = {
          Tag: be.Tag,
          Auftragsnummer: be.Auftragsnummer,
          Beginn: be.Beginn,
          Ende: be.Ende,
          LRE: be.LRE,
          PrivatKm: be.PrivatKm ?? 0,
        };
        return { ...basis, ...beAbgeleiteteWerte(basis, privatKmSatz) };
      });
      data.Daten = { BZ: bzMitDauer, BE: beMitDauer } satisfies IBereitschaftszeitraumPdfBody['Daten'];

      // Bereitschaftszulage: "Differenz BZ-BE" live aus denselben Zeilen wie die gedruckte Dauer-Spalte,
      // nicht aus dem Storage-Cache `datenBerechnung` (koennte veraltet sein).
      const bereitschaftMinuten =
        bzMitDauer.reduce((s, r) => s + r.Dauer, 0) - beMitDauer.reduce((s, r) => s + r.Dauer, 0);
      data.Bereitschaftszulage = bereitschaftszulageAbgeleiteteWerte(
        bereitschaftMinuten,
        localVorgabenU.Pers.TB,
        geldMonatB,
      );
      break;
    }
    case 'E': {
      const ewtRaw = tableToArray<IDatenEWT<string>>('tableE').filter(e => isEwtInMonat(e, Monat, 'buchungstag'));
      // Beamter = TB !== 'Tarifkraft' (Konvention wie in calculateBerechnungRows.ts); Grundlage für
      // `BeamterUeber8Wohnung`, den einzigen feldübergreifenden Fall in `ewtAbgeleiteteWerte()`.
      const beamter = localVorgabenU.Pers.TB !== 'Tarifkraft';
      // Die Einsatzort-Auswahl speichert nur die Tätigkeitsstätte (`Fahrzeit[].key`); für den Druck
      // wird die Beschreibung (`Fahrzeit[].text`) angehängt.
      const einsatzortBeschreibung = new Map(localVorgabenU.Fahrzeit.map(fz => [fz.key, fz.text]));
      data.Daten = {
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
      } satisfies IEwtPdfBody['Daten'];
      break;
    }
    case 'N': {
      const nRaw = filterByMonat(tableToArray<IDatenN>('tableN'), Monat, getMonatFromN);
      data.Daten = {
        N: nRaw.map(n => {
          const basis = {
            Tag: n.Tag,
            Beginn: n.Beginn,
            Ende: n.Ende,
            Auftragsnummer: n.Auftragsnummer,
            Zulagen: (n.Zulagen ?? []).map(z => ({ Typ: z.Typ, Wert: z.Wert })),
          };
          // Vorberechnete Arbeitszeit-Anzeige steht mit im Zeilenobjekt (Datenpfad Daten.N[].Arbeitszeit).
          return { ...basis, ...ezAbgeleiteteWerte(basis) };
        }),
      } satisfies INebengeldPdfBody['Daten'];
      break;
    }
    case 'EA': {
      const eaRaw = filterByMonat(tableToArray<IDatenEA>('tableEA'), Monat, getMonatFromEA);
      data.Daten = {
        EA: eaRaw.map(ea => ({
          Tag: ea.Tag,
          Dauer: ea.Dauer,
          Taetigkeit: ea.Taetigkeit,
          Entgeltgruppe: ea.Entgeltgruppe,
        })),
      } satisfies IEntgeltausgleichPdfBody['Daten'];
      break;
    }
    default:
      throw new Error('Modus fehlt');
  }

  try {
    console.time('generatePDF');

    // Die Formularversion wird server-seitig aufgelöst (`GET /formulare/<formular>?stichtag=`), das PDF
    // client-seitig per `build()` erzeugt. Stichtag = erster Tag des Exportmonats (ein Formularwechsel
    // mitten im Monat ist die Ausnahme). `data` hat bereits die Form, die `build()` als `Daten` braucht.
    const FORMULAR_JE_MODUS: { [key in typeof modus]: string } = { EA: 'ea', E: 'ewt', B: 'bereitschaft', N: 'ez' };
    const formular = FORMULAR_JE_MODUS[modus];
    const stichtag = dayjs([Jahr, Monat - 1, 1]).format('YYYY-MM-DD');
    const signatur = await signaturDialog();
    const bytes = await ladeUndErzeugePdf(formular, stichtag, data, signatur.png, signatur.digital);
    const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });

    const vorDateiName: { [key in typeof modus]: string } = {
      B: 'RB',
      E: 'Verpf.',
      N: 'EZ',
      EA: 'Entgeltausgleich',
    };
    const { Nachname, Vorname, Gewerk, ErsteTkgSt } = localVorgabenU.Pers;
    const monatStr = String(Monat).padStart(2, '0');
    const dateiName = `${vorDateiName[modus]} ${Nachname} ${Vorname.charAt(0)}. ${Gewerk} ${ErsteTkgSt} ${monatStr}.${Jahr}.pdf`;

    saveAs(blob, dateiName);
  } catch (error: unknown) {
    console.error('Fehler', error instanceof Error ? error.message : error);
    createSnackBar({
      message: `Download fehlerhaft:<br/>${error instanceof Error ? error.message : String(error)}`,
      status: 'error',
      timeout: 3000,
      fixed: true,
    });
  } finally {
    console.timeEnd('generatePDF');
    buttonDisable(false);
    clearLoading(button.id);
  }
}
