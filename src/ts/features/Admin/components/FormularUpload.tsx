import { useEffect, useState } from 'preact/hooks';
import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import { confirmDialog } from '@/infrastructure/ui/confirmDialog';
import { FormularEditor, leereSeite, type Konfig } from './FormularEditor/FormularEditor';
import { ZEILEN_QUELLEN, type FormularCode } from './FormularEditor/datenKatalog';
import { FormularVersionenListe } from './FormularVersionenListe';
import {
  aendereVersion,
  ApiFehler,
  holeVersionen,
  holeVorlageAlsDatei,
  ladeVorlagenHoch,
  legeVersionAn,
  loescheVersion,
  type VersionNutzdaten,
  type VersionUebersicht,
} from './formularVersionenApi';

const FORMULAR_CODES = ['ez', 'ewt', 'bereitschaft', 'ea'] as const;

const FORMULAR_LABELS: Record<(typeof FORMULAR_CODES)[number], string> = {
  ez: 'Zulagenzettel (EZ)',
  ewt: 'Einsatzwechseltätigkeit (EWT)',
  bereitschaft: 'Bereitschaft (B)',
  ea: 'Endgeltausgleich (EA)',
};

/** Intervall-Konflikt: die Kette hat danach eine Lücke oder eine nicht offene letzte Version. */
const KONFLIKT = 409;

function leereKonfig(formular: FormularCode): Konfig {
  return {
    seiten: [leereSeite()],
    tabellen: {
      haupt: { quelle: ZEILEN_QUELLEN[formular][0]?.pfad ?? '', startY: 700, maxZeilen: 10, hoehe: 14, spalten: [] },
    },
  };
}

function fehlerText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Admin-Oberfläche für die Formular-Versionen: EINE PDF-Vorlage (ein Layout pro Version -- die
 * ursprünglich geplante Aufteilung in einseitig/mehrseitig war nur wegen Kandidat C
 * (pyHanko-Signaturfeld-Namenskollision) nötig und entfällt unter Kandidat E) plus die
 * Koordinaten-Config, per `FormularEditor` (Phase 8) durch Klicken auf die echte PDF-Vorschau
 * gesetzt statt per Hand ins JSON getippt.
 *
 * Dieselbe Maske dient dem Anlegen und dem Bearbeiten: eine bestehende Version lädt ihre
 * Konfiguration und ihre PDF zurück in den Editor und wird per `PUT` überschrieben. Ohne diesen
 * Weg wäre ein Tippfehler nicht mehr korrigierbar und eine zweite Version gar nicht anlegbar --
 * `pruefeIntervalle()` verlangt eine lückenlose Kette, die Vorgängerin muss also erst geschlossen
 * werden können.
 */
export function FormularUpload() {
  const [formular, setFormular] = useState<FormularCode>('ez');
  const [version, setVersion] = useState('');
  const [gueltigVon, setGueltigVon] = useState('');
  const [gueltigBis, setGueltigBis] = useState('');
  const [datei, setDatei] = useState<File | null>(null);
  const [konfig, setKonfig] = useState<Konfig>(() => leereKonfig('ez'));
  const [speichert, setSpeichert] = useState(false);

  const [versionen, setVersionen] = useState<VersionUebersicht[]>([]);
  const [laedtListe, setLaedtListe] = useState(false);
  // Gesetzt = Bearbeiten-Modus. `vorlageId` ist die bereits hochgeladene PDF; sie wird nur ersetzt,
  // wenn im Dateifeld wirklich eine neue Datei gewählt wurde.
  const [bearbeiteId, setBearbeiteId] = useState<string | null>(null);
  const [vorlageId, setVorlageId] = useState<string | null>(null);

  async function ladeListe(code: FormularCode): Promise<void> {
    setLaedtListe(true);
    try {
      setVersionen(await holeVersionen(code));
    } catch (error) {
      createSnackBar({
        message: `Versionen konnten nicht geladen werden: ${fehlerText(error)}`,
        status: 'error',
        timeout: 4000,
      });
      setVersionen([]);
    } finally {
      setLaedtListe(false);
    }
  }

  // Bewusst nur am Formular-Code hängend: `ladeListe` wird bei jedem Render neu erzeugt und würde
  // als Abhängigkeit eine Endlosschleife auslösen.
  useEffect(() => {
    void ladeListe(formular);
  }, [formular]);

  function setzeFormularZurueck(code: FormularCode): void {
    setVersion('');
    setGueltigVon('');
    setGueltigBis('');
    setDatei(null);
    setVorlageId(null);
    setBearbeiteId(null);
    setKonfig(leereKonfig(code));
  }

  function wechsleFormular(code: FormularCode): void {
    setFormular(code);
    // Zeilen-Quelle und Datenpfade sind ressourcenspezifisch -- eine für `ez` gebaute Konfiguration
    // zeigt unter `ewt` ins Leere, deshalb bewusst zurücksetzen statt stillschweigend übernehmen.
    setzeFormularZurueck(code);
  }

  async function beginneBearbeiten(eintrag: VersionUebersicht): Promise<void> {
    setSpeichert(true);
    try {
      const geladen = await holeVorlageAlsDatei(eintrag.vorlageId);
      setVersion(eintrag.version);
      setGueltigVon(eintrag.gueltigVon);
      setGueltigBis(eintrag.gueltigBis ?? '');
      setKonfig({ ...eintrag.konfig, tabellen: eintrag.tabellen });
      setDatei(geladen);
      setVorlageId(eintrag.vorlageId);
      setBearbeiteId(eintrag.id);
    } catch (error) {
      createSnackBar({
        message: `Version konnte nicht geladen werden: ${fehlerText(error)}`,
        status: 'error',
        timeout: 4000,
        fixed: true,
      });
    } finally {
      setSpeichert(false);
    }
  }

  /**
   * Aus der gerade bearbeiteten Version eine eigenständige neue anlegen: Konfiguration, PDF und
   * „gültig bis" bleiben, aber die Maske wechselt in den Anlege-Modus (`bearbeiteId` zurück auf
   * `null` ⇒ `POST` statt `PUT`), und Versionsname wie „gültig ab" müssen neu vergeben werden.
   * Nichts wird gespeichert, bevor „Version anlegen" gedrückt wird.
   */
  function neueVersionAusBearbeitung(): void {
    setBearbeiteId(null);
    setVersion('');
    setGueltigVon('');
    createSnackBar({
      message: 'Neue Version aus der bearbeiteten Vorlage — Version und „gültig ab" neu vergeben.',
      status: 'info',
      timeout: 4000,
    });
  }

  async function handleLoeschen(eintrag: VersionUebersicht): Promise<void> {
    const bestaetigt = await confirmDialog(
      `Version "${eintrag.version}" (ab ${eintrag.gueltigVon}) endgültig löschen?\nDie zugehörige PDF-Vorlage wird mit entfernt, sofern keine andere Version sie nutzt.`,
      { title: 'Version löschen', confirmLabel: 'Löschen' },
    );
    if (!bestaetigt) return;

    setSpeichert(true);
    try {
      try {
        await loescheVersion(formular, eintrag.id);
      } catch (error) {
        if (!(error instanceof ApiFehler) || error.statusCode !== KONFLIKT) throw error;
        const trotzdem = await confirmDialog(`${error.message}\n\nTrotzdem löschen?`, {
          title: 'Lückenhafte Versionsreihe',
          confirmLabel: 'Trotzdem löschen',
        });
        if (!trotzdem) return;
        await loescheVersion(formular, eintrag.id, true);
      }

      createSnackBar({ message: `Version "${eintrag.version}" gelöscht`, status: 'success', timeout: 3000 });
      if (bearbeiteId === eintrag.id) setzeFormularZurueck(formular);
      await ladeListe(formular);
    } catch (error) {
      createSnackBar({ message: `Fehler: ${fehlerText(error)}`, status: 'error', timeout: 4000, fixed: true });
    } finally {
      setSpeichert(false);
    }
  }

  async function handleSubmit(e: Event): Promise<void> {
    e.preventDefault();
    if (!datei) {
      createSnackBar({ message: 'Die PDF-Vorlage ist erforderlich', status: 'error', timeout: 3000, fixed: true });
      return;
    }

    const { tabellen, ...rest } = konfig;

    setSpeichert(true);
    try {
      // Beim Bearbeiten ohne neue Datei bleibt die gespeicherte PDF stehen -- kein zweiter Upload
      // derselben Bytes, und die alte Datei wird nicht zur Leiche.
      const neueVorlageId = vorlageId ?? (await ladeVorlagenHoch(formular, datei));
      const daten: VersionNutzdaten = {
        version,
        gueltigVon,
        gueltigBis: gueltigBis || null,
        vorlageId: neueVorlageId,
        konfig: rest,
        tabellen,
      };

      if (bearbeiteId) {
        try {
          await aendereVersion(formular, bearbeiteId, daten);
        } catch (error) {
          if (!(error instanceof ApiFehler) || error.statusCode !== KONFLIKT) throw error;
          // Zwangsläufiger Zwischenstand: die Vorgängerversion zu schließen macht die Kette
          // kurzzeitig ungültig, bis die Nachfolgerin angelegt ist.
          const trotzdem = await confirmDialog(`${error.message}\n\nTrotzdem speichern?`, {
            title: 'Lückenhafte Versionsreihe',
            confirmLabel: 'Trotzdem speichern',
          });
          if (!trotzdem) return;
          await aendereVersion(formular, bearbeiteId, daten, true);
        }
        createSnackBar({ message: `Version "${version}" gespeichert`, status: 'success', timeout: 3000 });
      } else {
        await legeVersionAn(formular, daten);
        createSnackBar({ message: `Version "${version}" für ${formular} angelegt`, status: 'success', timeout: 3000 });
      }

      setzeFormularZurueck(formular);
      await ladeListe(formular);
    } catch (error) {
      createSnackBar({ message: `Fehler: ${fehlerText(error)}`, status: 'error', timeout: 4000, fixed: true });
    } finally {
      setSpeichert(false);
    }
  }

  return (
    <form class="d-flex flex-column gap-3" onSubmit={e => void handleSubmit(e)}>
      <h5 class="mb-0">{bearbeiteId ? 'Formular-Version bearbeiten' : 'Formular-Vorlage hochladen'}</h5>
      <p class="small text-body-secondary mb-0">
        Version anlegen: eine fertige PDF-Vorlage (reines Text-Layout, in LibreOffice aus dem xlsx exportiert) plus die
        Koordinaten-Config. Bestehende Versionen lassen sich unten bearbeiten oder löschen — beides prüft, ob die
        Gültigkeitszeiträume danach lückenlos aneinander anschließen, und fragt sonst nach.
      </p>

      <div class="border rounded p-2">
        <h6 class="small fw-semibold">Vorhandene Versionen ({formular})</h6>
        <FormularVersionenListe
          versionen={versionen}
          bearbeiteId={bearbeiteId}
          laedt={laedtListe}
          onBearbeiten={v => void beginneBearbeiten(v)}
          onLoeschen={v => void handleLoeschen(v)}
        />
      </div>

      <div class="row g-2">
        <div class="col-md-3">
          <label class="form-label" for="formular-upload-code">
            Formular
          </label>
          <select
            id="formular-upload-code"
            class="form-select"
            value={formular}
            onChange={e => wechsleFormular((e.target as HTMLSelectElement).value as FormularCode)}
          >
            {FORMULAR_CODES.map(code => (
              <option key={code} value={code}>
                {FORMULAR_LABELS[code]}
              </option>
            ))}
          </select>
        </div>
        <div class="col-md-3">
          <label class="form-label" for="formular-upload-version">
            Version
          </label>
          <input
            id="formular-upload-version"
            class="form-control"
            value={version}
            onInput={e => setVersion((e.target as HTMLInputElement).value)}
            required
          />
        </div>
        <div class="col-md-3">
          <label class="form-label" for="formular-upload-gueltig-von">
            Gültig ab
          </label>
          <input
            id="formular-upload-gueltig-von"
            type="date"
            class="form-control"
            value={gueltigVon}
            onInput={e => setGueltigVon((e.target as HTMLInputElement).value)}
            required
          />
        </div>
        <div class="col-md-3">
          <label class="form-label" for="formular-upload-gueltig-bis">
            Gültig bis (leer = offen)
          </label>
          <input
            id="formular-upload-gueltig-bis"
            type="date"
            class="form-control"
            value={gueltigBis}
            onInput={e => setGueltigBis((e.target as HTMLInputElement).value)}
          />
        </div>
      </div>

      <div>
        <label class="form-label" for="formular-upload-pdf">
          PDF-Vorlage{bearbeiteId ? ' (leer lassen, um die gespeicherte zu behalten)' : ''}
        </label>
        <input
          id="formular-upload-pdf"
          type="file"
          accept="application/pdf"
          class="form-control"
          onChange={e => {
            const gewaehlt = (e.target as HTMLInputElement).files?.[0] ?? null;
            // Neue Datei = neuer Upload; die bisherige Vorlagen-ID darf dann nicht weiterverwendet
            // werden, sonst bliebe die alte PDF stehen und die Auswahl wäre wirkungslos.
            if (gewaehlt) setVorlageId(null);
            setDatei(gewaehlt);
          }}
          required={!bearbeiteId}
        />
      </div>

      <details class="border rounded p-2 bg-body-secondary">
        <summary class="small fw-semibold" style="cursor: pointer">
          Hilfe zur Koordinaten-Config
        </summary>
        <div class="small mt-2">
          <p class="mb-2">
            Koordinatensystem: PDF-Punkte (1pt = 1/72 Zoll), Ursprung <strong>unten links</strong>. A4 = 595×842pt.
          </p>
          <p class="mb-1">
            <strong>Die PDF-Vorlage ist EINE Datei mit allen Seiten</strong> — nicht je Seite eine eigene Datei. Ist das
            Formular dreiseitig, enthält die hochgeladene PDF genau diese drei Seiten (im xlsx alle Blätter zusammen
            nach PDF exportieren). Im Editor legst du darüber die <strong>Seitenfolge</strong> an: „+ Seite" hängt eine
            weitere an, und der Seiten-Navigator über der Vorschau bestimmt mit „Als Quelle verwenden", welche Seite der
            hochgeladenen PDF sie benutzt. Zwei Seitendefinitionen dürfen dieselbe PDF-Seite nutzen, wenn sie nur anders
            befüllt werden.
          </p>
          <p class="mb-1">
            Welche Seiten im Ergebnis landen, entscheiden die Daten: Seite 1 kommt immer, jede weitere nur, wenn ihre
            Tabellen Zeilen haben (oder sie gar keine Tabelle trägt). Eine Seite mit{' '}
            <em>„Diese Seite bei Überlauf wiederholen"</em> wird so oft gedruckt, wie noch Zeilen übrig sind — bei EA
            ist das die einzige Seite, bei Bereitschaft die letzte (Seiten 1, 2 und 3 sehen unterschiedlich aus, ab 3
            wird wiederholt). Ohne eine solche Seite bricht die Erzeugung ab, sobald Zeilen übrig bleiben.
            <em>Einstellungen übernehmen von</em> kopiert eine bestehende Seite (Felder, Tabellenbereiche, Signatur) auf
            die aktuelle — die Vorlagenseite bleibt dabei, wie sie ist.
          </p>
          <p class="mb-1">
            Eintrag in der Liste rechts <em>scharf schalten</em>, dann links auf dem PDF ein{' '}
            <strong>Rechteck über die Zelle ziehen</strong> (Maustaste gedrückt halten — die Lupe zeigt den vergrößerten
            Ausschnitt). Der Text wird laut Ausrichtung in dieser Zelle platziert, bei „zentriert" mittig zwischen den
            beiden Kanten.
          </p>
          <ul class="mb-2">
            <li>
              <strong>Felder</strong> — alles außerhalb der Datentabelle: Kopfangaben, Summen, Übertrag, Seitenzahl. Es
              gibt bewusst nur einen Bereich, denn die Position bestimmt allein die gezogene Zelle. Je Feld wählbar:
              <em>Datenfeld</em> (aus der Liste der wirklich gelieferten Werte), <em>Mehrere</em> (zusammengesetzt, z.B.
              „Nachname, Vorname" oder Adresszeilen — Trennzeichen frei wählbar, leere Teile fallen weg),
              <em>Summe</em> oder <em>fester Text</em>.
            </li>
            <li>
              <strong>Summen</strong> — Summe/Anzahl/Maximum, wahlweise über <em>alle Zeilen</em> (Gesamtsumme),
              <em>nur diese Seite</em> (Zwischensumme) oder <em>alle Vorseiten</em> (Übertrag). Das ersetzt die frühere
              Trennung in Kopf-, Seitenfuß- und Fußbereich.
            </li>
            <li>
              <strong>Fester Text</strong> — Platzhalter in geschweiften Klammern werden ersetzt:{' '}
              <code>{'{seite}'}</code>/<code>{'{seiten}'}</code> für die Seitenzahl, <code>{'{heute}'}</code> für den
              Tag der Erzeugung, jeder andere Name als Datenpfad (z.B. <code>{'Zulagen {Monat}/{Jahr}'}</code>). So wird
              auch die Seitenzahl gesetzt — sie ist nicht fest eingebaut; ohne solches Feld erscheint keine. Die beiden
              Seitenzahlen vertragen einen ganzzahligen Versatz, für Verweise auf die Nachbarseite:{' '}
              <code>{'Übertrag von Seite {seite-1}'}</code> oder <code>{'weiter auf Seite {seite+1}'}</code>.
            </li>
            <li>
              <strong>Datum neben der Unterschrift</strong> — Summenart <em>Letztes Datum</em> über ein Datumsfeld der
              Tabelle, dazu eine Frist in Tagen: liegt der jüngste Eintrag noch innerhalb der Frist, wird sein Datum
              gesetzt, sonst das heutige. Ohne Frist immer der letzte Eintrag; für ein reines Tagesdatum genügt{' '}
              <code>{'{heute}'}</code> im festen Text.
            </li>
            <li>
              <strong>Zeilenraster</strong> — waagerechtes Band über die erste Datenzeile ziehen: setzt Startposition
              und Zeilenhöhe in einem Schritt. „Zeilen auf dieser Seite" als Zahl eingeben. Eine Übertragszeile belegt
              optisch einen Slot, diese Zahl also entsprechend kleiner setzen. Am linken Seitenrand zeigt ein Indikator
              ohne Beschriftung, wie weit die Tabelle damit reicht — ein Strich je Zeile, eine eigene Spur je Tabelle.
              Laufen die Striche nach unten aus den Zeilen heraus, ist die Höhe minimal daneben: dann zusätzlich{' '}
              <em>letzte Datenzeile</em> markieren, die Höhe wird daraus über alle Zeilen gemittelt statt aus einer
              einzelnen Messung.
            </li>
            <li>
              <strong>Spalten</strong> — Rechteck über die Spalte ziehen, davon werden nur die linke/rechte Kante
              übernommen (die Höhe kommt aus dem Zeilenraster). Optional <em>berechnet</em> aus anderen Feldern
              derselben Zeile (z.B. Produkt aus Dauer und Satz). Spalten gelten normalerweise für alle Seiten; hat eine
              Seite ein abweichendes Raster, schaltet <em>eigene je Seite</em> ein Spaltenset nur für diese Seite frei
              (die vorhandenen werden dabei als Ausgangspunkt kopiert). Berechnete Spalten gehören trotzdem in die
              Tabelle selbst — nur so lässt sich über sie summieren.
            </li>
            <li>
              <strong>Dynamische Spalten (nur EZ)</strong> — die Zulagen einer Zeile sind eine Liste, im Formular stehen
              dafür feste Spaltenplätze, und welcher Code über welcher Spalte steht, hängt vom Monat ab. Unter der
              Tabelle legt „+ Erschwerniszulagen" (bzw. Leistungsprämie / Ganzkörperreinigung) die Gruppe samt der
              passenden Zahl von Spaltenplätzen an; jeden Platz danach wie eine normale Spalte auf dem PDF markieren.
              Die zugehörige <em>Überschrift</em> ist ein eigenes Feld (Modus „Überschrift"): es zeigt den Code, der auf
              diesem Platz gelandet ist — wahlweise als Kurztext. Plätze, für die es im Monat keine Zulage gab, bleiben
              samt Überschrift leer.
            </li>
            <li>
              <strong>Gedrehter Text</strong> — je Zelle einstellbar: 90° liest von unten nach oben (die schmalen
              Namensfelder am Blattrand), 270° von oben nach unten. Die Zelle wird dabei ganz normal als Rechteck
              aufgezogen; Ausrichtung und Zentrierung drehen sich mit.
            </li>
            <li>
              <strong>Signatur-Fläche</strong> — Rechteck für die im Browser gezeichnete Unterschrift aufziehen. Die
              Testdaten-Vorschau setzt dort einen Beispiel-Schriftzug ein, damit Größe und Lage prüfbar sind.
              <br />
              <strong>Nicht dasselbe wie eine zertifikatsbasierte Signatur:</strong> für die zwei prüfenden Personen
              wird bewusst <em>kein</em> Signaturfeld ins PDF gelegt. Sie signieren das fertige PDF im kostenlosen Adobe
              Reader über <em>Werkzeuge → Zertifikate → Digital signieren</em> und ziehen die Box dort selbst auf. Hier
              ist dafür nichts zu hinterlegen — es genügt, im Formular Platz für die Unterschriften freizulassen.
            </li>
          </ul>
          <p class="mb-1">
            Schriftgröße, Ausrichtung und Format gelten je Zelle; <em>Schrift automatisch verkleinern</em> passt zu
            lange Werte in die Zelle ein, <em>Zeilenumbruch</em> bricht an Wortgrenzen um. Senkrecht wird der Text immer
            in der Zelle zentriert, sobald sie als Rechteck aufgezogen wurde — ein Feld ohne Ober-/Unterkante sitzt
            dagegen mit seiner Grundlinie auf dem gesetzten y-Wert. Die Koordinaten-Anzeige rechts im Kopf jedes
            Eintrags lässt sich aufklappen, um die Kanten nachträglich exakt anzugleichen (z.B. gleiche Höhe wie das
            Feld daneben).
          </p>
          <p class="mb-0">
            Zwei Vorschauen erzeugen jeweils ein echtes PDF: <em>Beispieldaten</em> füllt fachlich passende Werte ein
            (Name, Personalnummer, Auftragsnummern, Datum) und sieht damit aus wie ein ausgefülltes Formular;{' '}
            <em>Platzhalter</em> setzt generische Füllwerte und zeigt vor allem, welche Zelle zu welchem Eintrag gehört.
            Die Werte-Vorschau unter jedem Eintrag in der Liste nutzt die Beispieldaten. Unter dem Editor liegt die
            komplette Konfiguration als JSON zum Kopieren, Sichern und Wiedereinfügen.
          </p>
        </div>
      </details>

      {datei ? (
        <FormularEditor formular={formular} datei={datei} value={konfig} onChange={setKonfig} />
      ) : (
        <p class="text-body-secondary small">PDF-Vorlage zuerst auswählen, um Koordinaten setzen zu können.</p>
      )}

      <div class="d-flex gap-2">
        <button type="submit" class="btn btn-primary" disabled={speichert}>
          {speichert ? 'Speichert…' : bearbeiteId ? 'Änderungen speichern' : 'Version anlegen'}
        </button>
        {bearbeiteId && (
          <>
            <button
              type="button"
              class="btn btn-outline-primary"
              disabled={speichert}
              onClick={neueVersionAusBearbeitung}
              title="Konfiguration und PDF übernehmen, aber als neue Version speichern statt die bestehende zu überschreiben"
            >
              Als neue Version anlegen
            </button>
            <button
              type="button"
              class="btn btn-outline-secondary"
              disabled={speichert}
              onClick={() => setzeFormularZurueck(formular)}
            >
              Bearbeiten abbrechen
            </button>
          </>
        )}
      </div>
    </form>
  );
}
