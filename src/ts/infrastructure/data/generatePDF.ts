import { saveAs } from 'file-saver';
import Storage from '../storage/Storage';
import buttonDisable from '../ui/buttonDisable';
import clearLoading from '../ui/clearLoading';
import setLoading from '../ui/setLoading';
import { createSnackBar } from '../ui/CustomSnackbar';
import type { IVorgabenGeld, IVorgabenGeldType, IVorgabenU } from '@/types';
import { featureRegistry } from '@/core/hooks';
import type { FeaturePdfModus } from '@/core/hooks';
import dayjs from '../date/configDayjs';
import { splitOeInput } from './oeLevels';
import { ladeUndErzeugePdf } from '../pdf/ladeFormular';
import { signaturDialog } from '../pdf/signaturDialog';

/**
 * Erzeugt das PDF eines Formulars aus den Tabellendaten des aktuellen Monats und laedt es herunter.
 * Bricht ohne Button oder offline still ab; Fehler erscheinen als Snackbar, Button-Sperre und
 * Ladeanzeige werden am Ende immer zurueckgesetzt.
 *
 * @param button - Ausloesender Button (Id fuer die Ladeanzeige); bei `null` passiert nichts.
 * @param modus - Formular-Modus eines Features (`meta.pdf.modus`): `B` Bereitschaft, `E` EWT, `N` Nebengeld, `EA` Entgeltausgleich.
 * @throws {Error} Bei unbekanntem `modus` ('Modus fehlt').
 */
export default async function generatePDF(button: HTMLButtonElement | null, modus: FeaturePdfModus): Promise<void> {
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

  // Das Feature zum Modus liefert Formular, Dateiprefix und (lazy) den Datenaufbau.
  const feature = featureRegistry.metaByPdfModus(modus);
  if (!feature) throw new Error('Modus fehlt');

  try {
    console.time('generatePDF');

    // Daten: CustomTable-Zeilen -> kanonisches PDF-Daten-Format (datenKatalog.ts/wert.ts), aufgebaut vom Feature.
    const pdfTeil = await featureRegistry.load(feature.id, 'pdf');
    Object.assign(
      data,
      pdfTeil.baueDaten({ monat: Monat, jahr: Jahr, vorgabenU: localVorgabenU, vorgabenGeld: VorgabenGeld[Monat] }),
    );

    // Die Formularversion wird server-seitig aufgelöst (`GET /formulare/<formular>?stichtag=`), das PDF
    // client-seitig per `build()` erzeugt. Stichtag = erster Tag des Exportmonats (ein Formularwechsel
    // mitten im Monat ist die Ausnahme). `data` hat bereits die Form, die `build()` als `Daten` braucht.
    const { formular, dateiPraefix } = feature.pdf;
    const stichtag = dayjs([Jahr, Monat - 1, 1]).format('YYYY-MM-DD');
    const signatur = await signaturDialog();
    const bytes = await ladeUndErzeugePdf(formular, stichtag, data, signatur.png, signatur.digital);
    const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });

    const { Nachname, Vorname, Gewerk, ErsteTkgSt } = localVorgabenU.Pers;
    const monatStr = String(Monat).padStart(2, '0');
    const dateiName = `${dateiPraefix} ${Nachname} ${Vorname.charAt(0)}. ${Gewerk} ${ErsteTkgSt} ${monatStr}.${Jahr}.pdf`;

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
