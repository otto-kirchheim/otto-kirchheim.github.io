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
  IBereitschaftszeitraumDownloadBody,
  IEntgeltausgleichDownloadBody,
  INebengeldDownloadBody,
} from '@otto-kirchheim/nebengeld-shared';
import {
  beAbgeleiteteWerte,
  bereitschaftszulageAbgeleiteteWerte,
  bzAbgeleiteteWerte,
  ewtAbgeleiteteWerte,
  ezAbgeleiteteWerte,
} from '@otto-kirchheim/nebengeld-shared';
import tableToArray from './tableToArray';
import dayjs from '../date/configDayjs';
import { userProfileToBackend } from './fieldMapper';
import { downloadPdf } from '../api/apiService';
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

export default async function download(button: HTMLButtonElement | null, modus: 'B' | 'E' | 'N' | 'EA'): Promise<void> {
  if (button === null) return;

  if (!navigator.onLine) {
    createSnackBar({
      message: 'Download nicht möglich – keine Internetverbindung',
      status: 'error',
      timeout: 3000,
      fixed: true,
    });
    return;
  }

  setLoading(button.id);
  buttonDisable(true);

  const MonatInput = document.querySelector<HTMLInputElement>('#Monat');
  const JahrInput = document.querySelector<HTMLInputElement>('#Jahr');

  if (!MonatInput || !JahrInput) throw new Error('Input Element nicht gefunden');

  const VorgabenGeldDaten: IVorgabenGeld = Storage.get('VorgabenGeld', { check: true });
  const VorgabenGeldHandler: ProxyHandler<IVorgabenGeld> = {
    get: (target: IVorgabenGeld, prop: string): IVorgabenGeldType => {
      const maxMonat: number = Number(prop);
      let returnObjekt = target[1];
      const keys = Object.keys(target).map(Number);
      if (keys.length > 1 && maxMonat > 1 && Math.max(...keys.filter(key => key <= maxMonat)) > 1)
        for (let monat = 2; monat <= maxMonat; monat++)
          if (typeof target[monat] !== 'undefined') returnObjekt = { ...returnObjekt, ...target[monat] };
      return returnObjekt;
    },
    set: (_target: IVorgabenGeld, prop: string, newValue) => {
      console.log('veränderung von datenGeld nicht erlaubt:', prop, newValue);
      return false;
    },
  };
  const VorgabenGeld = new Proxy(VorgabenGeldDaten, VorgabenGeldHandler);

  const Monat = +MonatInput.value;
  const Jahr = +JahrInput.value;
  const localVorgabenU = Storage.get<IVorgabenU>('VorgabenU', { check: true });
  const backendVorgabenU = userProfileToBackend(localVorgabenU);

  const data: Record<string, unknown> = {
    // Backend-Download-Schema erwartet `Pers` und `Fahrzeit` im Backend-Format. `Name` gibt es in
    // `IPers` nicht (kein echtes Profil-Feld, nur PDF-Druckkomfort) -- deshalb hier zusammengesetzt
    // statt in `userProfileToBackend()`, das auch fürs Profil-Speichern verwendet wird und dessen
    // Rückgabe nicht um ein zusätzliches, vom Backend nicht erwartetes Feld ergänzt werden soll.
    VorgabenU: {
      Pers: { ...backendVorgabenU.Pers, Name: `${backendVorgabenU.Pers.Nachname}, ${backendVorgabenU.Pers.Vorname}` },
      Fahrzeit: backendVorgabenU.Fahrzeit,
    },
    VorgabenGeld: VorgabenGeld[Monat],
    Monat,
    Jahr,
  };

  const normalizeEwtSchichtForDownload = (schicht: string): string => {
    if (schicht === 'SP') return 'T';
    if (schicht === 'BN') return 'N';
    return schicht;
  };

  // Daten: Frontend-Feldnamen → Backend-Feldnamen mappen
  switch (modus) {
    case 'B': {
      const bzRaw = filterByMonat(tableToArray<IDatenBZ<string>>('tableBZ'), Monat, getMonatFromBZ);
      const beRaw = filterByMonat(tableToArray<IDatenBE>('tableBE'), Monat, getMonatFromBE);
      // Beamter = TB !== 'Tarifkraft' (Konvention siehe calculateBerechnungRows.ts) -- bestimmt den
      // Privat-km-Satz aus VorgabenGeld fuer beAbgeleiteteWerte(); Tarifkraft/Beamter haben laut
      // VorgabenGeld unterschiedliche Sollwerte.
      const beamter = localVorgabenU.Pers.TB !== 'Tarifkraft';
      const geldMonatB = VorgabenGeld[Monat];
      const privatKmSatz = beamter ? geldMonatB.PrivatPKWBeamter : geldMonatB.PrivatPKWTarif;
      // Vorberechnete `Dauer`/`PrivatKmBetrag` (Phase 11) direkt mit ins Zeilenobjekt -- `build()`
      // sieht sie dann als normalen Datenpfad (Daten.BZ[].Dauer/Daten.BE[].Dauer/PrivatKmBetrag),
      // analog EWT (Phase 10). In benannten Variablen gehalten (statt inline in `data.Daten`), weil
      // dieselben Zeilen gleich nochmal für die Bereitschaftszulage summiert werden.
      const bzMitDauer = bzRaw.map(bz => {
        const basis = { Beginn: bz.Beginn, Ende: bz.Ende, Pause: bz.Pause ?? 0 };
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
      data.Daten = { BZ: bzMitDauer, BE: beMitDauer } satisfies IBereitschaftszeitraumDownloadBody['Daten'];

      // Bereitschaftszulage (Nachtrag Phase 11): "Differenz BZ-BE" live aus denselben Zeilen, die
      // auch die gedruckte Dauer-Spalte füllen -- kein Storage-Cache (`datenBerechnung`), keine
      // Staleness möglich, siehe `bereitschaftszulageAbgeleiteteWerte()`-Kommentar.
      const bereitschaftMinuten = bzMitDauer.reduce((s, r) => s + r.Dauer, 0) - beMitDauer.reduce((s, r) => s + r.Dauer, 0);
      data.Bereitschaftszulage = bereitschaftszulageAbgeleiteteWerte(bereitschaftMinuten, localVorgabenU.Pers.TB, geldMonatB);
      break;
    }
    case 'E': {
      const ewtRaw = tableToArray<IDatenEWT<string>>('tableE').filter(e => isEwtInMonat(e, Monat, 'buchungstag'));
      // Beamter = TB !== 'Tarifkraft' (Konvention siehe calculateBerechnungRows.ts) -- Grundlage
      // für `BeamterUeber8Wohnung`, den einzigen feldübergreifenden Fall in `ewtAbgeleiteteWerte()`.
      const beamter = localVorgabenU.Pers.TB !== 'Tarifkraft';
      data.Daten = {
        // Hinweis: `Buchungstag` wird hier als zweistelliger Tages-String gesendet, das
        // geteilte IEwtDownloadBody['Daten'] typisiert es (wie das bisherige Backend-Modell)
        // als `number` -- vorbestehende Diskrepanz, unveraendert uebernommen (kein Funktions-/
        // Logik-Fix im Rahmen dieser Typen-Migration).
        EWT: ewtRaw.map(e => {
          const basis = {
            Buchungstag: dayjs(e.Buchungstag || calculateBuchungstagEwt(e)).format('DD'),
            Einsatzort: e.Einsatzort,
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
          // Vorberechnete Dauer/Zeitband-Felder (Phase 10) direkt mit ins Zeilenobjekt --
          // `build()` sieht sie dann als normale Datenpfade (Daten.EWT[].DauerWohnung etc.).
          return { ...basis, ...ewtAbgeleiteteWerte(basis, beamter) };
        }),
      };
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
          // Vorberechnete Arbeitszeit-Anzeige (Phase 12) direkt mit ins Zeilenobjekt -- `build()`
          // sieht sie dann als normalen Datenpfad (Daten.N[].Arbeitszeit), analog EWT/Bereitschaft.
          return { ...basis, ...ezAbgeleiteteWerte(basis) };
        }),
      } satisfies INebengeldDownloadBody['Daten'];
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
      } satisfies IEntgeltausgleichDownloadBody['Daten'];
      break;
    }
    default:
      throw new Error('Modus fehlt');
  }

  try {
    console.time('download');

    let blob: Blob;
    let filename: string | undefined;

    if (modus === 'EA' || modus === 'E' || modus === 'B' || modus === 'N') {
      // Neuer Weg (Phase 9 EA, Phase 10 EWT, Phase 11 Bereitschaft, Phase 12 EZ): Version
      // server-seitig auflösen (`GET /formulare/<formular>?stichtag=`), PDF client-seitig per
      // `build()` erzeugen -- kein Backend-Roundtrip mehr für den PDF-Inhalt selbst. Stichtag =
      // erster Tag des Exportmonats (ein Formular-Wechsel mitten im Monat ist die Ausnahme, nicht
      // der Regelfall). `data` hat hier bereits exakt die Form, die `build()` als `Daten` braucht.
      // Mapped Type statt Ternary-Kette: zwingt bei jedem hier neu aufgenommenen Modus zum
      // passenden Eintrag, statt still im letzten Zweig zu landen.
      const FORMULAR_JE_MODUS: { [key in typeof modus]: string } = { EA: 'ea', E: 'ewt', B: 'bereitschaft', N: 'ez' };
      const formular = FORMULAR_JE_MODUS[modus];
      const stichtag = dayjs([Jahr, Monat - 1, 1]).format('YYYY-MM-DD');
      const signaturPng = await signaturDialog();
      const bytes = await ladeUndErzeugePdf(formular, stichtag, data, signaturPng);
      blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
    } else {
      ({ blob, filename } = await downloadPdf(modus, data));
    }

    let dateiName = filename;
    if (!dateiName || dateiName === 'download.pdf') {
      // Namensschema deckt sich bewusst mit dem Server (`buildBaseFileName`/`dateiName` in
      // backend/src/utils/download.helpers.ts bzw. den einzelnen `*.service.ts::download()`) --
      // EA/E/B/N liefern seit Phase 9-12 gar keinen Header mehr (kein Backend-Roundtrip für den
      // PDF-Inhalt), landen also immer hier.
      const vorDateiName: { [key in typeof modus]: string } = {
        B: 'RB',
        E: 'Verpf.',
        N: 'EZ',
        EA: 'Entgeltausgleich',
      };
      const { Nachname, Vorname, Gewerk, ErsteTkgSt } = localVorgabenU.Pers;
      const monatStr = String(Monat).padStart(2, '0');
      dateiName = `${vorDateiName[modus]} ${Nachname} ${Vorname.charAt(0)}. ${Gewerk} ${ErsteTkgSt} ${monatStr}.${Jahr}.pdf`;
    }

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
    console.timeEnd('download');
    buttonDisable(false);
    clearLoading(button.id);
  }
}
