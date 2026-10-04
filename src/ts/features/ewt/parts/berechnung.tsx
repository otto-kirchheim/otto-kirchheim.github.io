import type { FeatureParts } from '@/shared/lib/feature';
import type { IBerechnungMonatsErgebnis, IDatenEWT, IVorgabenBerechnungMonat } from '@/types';
import dayjs from '@/shared/lib/date/configDayjs';
import { getMonatFromEWTBuchungstag } from '@/shared/lib/date/getMonatFromItem';
import { anzeige, currency } from '@/shared/lib/ressource/berechnungWerte';
import { GruppenTitel, LabelTabelle, SchwellenZeilen } from '@/shared/ui/berechnung/berechnungBausteine';

type Bucket = IVorgabenBerechnungMonat['E'];

/**
 * Prüft, ob `value` im halboffenen Bereich `[min, max)` liegt.
 *
 * @param value - Zu prüfender Wert.
 * @param min - Untergrenze (eingeschlossen).
 * @param max - Obergrenze (ausgeschlossen).
 * @returns `true` bei Treffer.
 */
const isInRange = (value: number, min: number, max = Infinity): boolean => value >= min && value < max;

/**
 * Berechnungs-Slot der EWT: Abwesenheitsklassen (Wohnung, steuerfrei) je Monat nach Buchungstag, Sätze je Tarifkraft/Beamter
 * (`sums`-Block 1 der Berechnung) sowie Tabellenzeilen und Monatskarte.
 */
const berechnung: FeatureParts['berechnung'] = {
  bucketKey: 'E',

  /**
   * Summiert die EWT-Abwesenheitsklassen eines Monats.
   *
   * @param rows - EWT-Zeilen (alle Monate).
   * @param monat - Monat (1-12), nach Buchungstag.
   * @returns Bucket `E` des Monats.
   */
  aggregate(rows, monat): Bucket {
    const bucket: Bucket = { A8: 0, A14: 0, A24: 0, S8: 0, S14: 0 };

    (rows.EWT as IDatenEWT[] | undefined)
      ?.filter(value => getMonatFromEWTBuchungstag(value) === monat)
      .forEach(value => {
        const tagAnfang = dayjs(value.Tag);
        if (!tagAnfang.isValid()) return;

        if (value.abWE && value.anWE) {
          const [abWH, abWM] = value.abWE.split(':').map(Number);
          const [anWH, anWM] = value.anWE.split(':').map(Number);
          const von = tagAnfang.hour(abWH).minute(abWM);
          let bis = tagAnfang.hour(anWH).minute(anWM);
          if (bis.isBefore(von)) bis = bis.add(1, 'day');

          const abWohnung = bis.diff(von, 'hour', true);

          if (isInRange(abWohnung, 8, 14)) bucket.A8++;
          else if (isInRange(abWohnung, 14, 24)) bucket.A14++;
          else if (abWohnung >= 24) bucket.A24++;
        }
        if (value.ab1E && value.an1E) {
          const [ab1H, ab1M] = value.ab1E.split(':').map(Number);
          const [an1H, an1M] = value.an1E.split(':').map(Number);
          const von = tagAnfang.hour(ab1H).minute(ab1M);
          let bis = tagAnfang.hour(an1H).minute(an1M);
          if (bis.isBefore(von)) bis = bis.add(1, 'day');

          const ab1Taetigkeit = bis.diff(von, 'hour', true);

          if (ab1Taetigkeit >= 8 && ab1Taetigkeit < 24) bucket.S8++;
          else if (ab1Taetigkeit >= 24) bucket.S14++;
        }
      });

    return bucket;
  },

  /**
   * Formeln der EWT. Die Zwischensumme baut sich nacheinander auf (`+=`); die Reihenfolge darf nicht verändert werden.
   *
   * @param bucketRoh - Bucket `E` des Monats.
   * @param kontext - Tarifkraft/Beamter und Geldsätze des Monats.
   * @returns Beitrag mit EWT-Feldern und Zwischensumme.
   */
  calc(bucketRoh, { tarifKraft, geld }) {
    const item = bucketRoh as Bucket;
    const ergebnis: Partial<IBerechnungMonatsErgebnis> = {};
    const sums: number[] = [];

    if (tarifKraft === 'Tarifkraft') {
      if (item.A8 !== 0) sums[0] = item.A8 * geld.TE8;
      if (item.A14 !== 0) sums[0] += item.A14 * geld.TE14;
      if (item.A24 !== 0) sums[0] += item.A24 * geld.TE24;
    }
    if (item.A8 > 0 || item.A14 > 0 || item.A24 > 0)
      ergebnis.abwesenheiten = { a8: item.A8, a14: item.A14, a24: item.A24 };

    if (tarifKraft !== 'Tarifkraft') {
      if (item.S8 !== 0) sums[0] = item.S8 * geld.BE8;
      if (item.S14 !== 0) sums[0] += item.S14 * geld.BE14;
    }
    if (item.S8 > 0 || item.S14 > 0) ergebnis.steuerfreieAbwesenheiten = { s8: item.S8, s14: item.S14 };

    if (sums.length > 0) ergebnis.summeEwt = sums[0];

    return { ergebnis, summe: sums.length > 0 ? sums[0] : undefined, zaehltInGesamtsumme: true };
  },

  /**
   * Prüft, ob ein Monatsergebnis anzeigbare Werte der EWT enthält.
   *
   * @param ergebnis - Monatsergebnis.
   * @returns `true`, wenn mindestens ein Feld der Gruppe nicht `null` ist.
   */
  hatDaten: ergebnis =>
    ergebnis.abwesenheiten !== null || ergebnis.steuerfreieAbwesenheiten !== null || ergebnis.summeEwt !== null,

  tabelle: () => [
    {
      id: 'abwesenheiten',
      label: (
        <LabelTabelle
          zeilen={[
            ['Anzahl der', '>8'],
            ['Abwesenheiten', '>14'],
            ['', '>24'],
          ]}
        />
      ),
      inhalt: m =>
        m.abwesenheiten === null ? (
          ''
        ) : (
          <>
            {anzeige(m.abwesenheiten.a8)} <br />
            {anzeige(m.abwesenheiten.a14)} <br />
            {anzeige(m.abwesenheiten.a24)}
          </>
        ),
    },
    {
      id: 'steuerfreieAbwesenheiten',
      label: (
        <LabelTabelle
          zeilen={[
            ['steuerfreie', '>8'],
            ['Abwesenheiten', '>14'],
          ]}
        />
      ),
      inhalt: m =>
        m.steuerfreieAbwesenheiten === null ? (
          ''
        ) : (
          <>
            {anzeige(m.steuerfreieAbwesenheiten.s8)} <br /> {anzeige(m.steuerfreieAbwesenheiten.s14)}
          </>
        ),
    },
    { id: 'summeEwt', label: 'Summe EWT', inhalt: m => currency(m.summeEwt) },
  ],

  karte: ergebnis => (
    <>
      <GruppenTitel titel="EWT" summe={ergebnis.summeEwt} />
      {ergebnis.abwesenheiten !== null && (
        <SchwellenZeilen
          praefix="Abwesenheiten"
          eintraege={[
            ['>8', ergebnis.abwesenheiten.a8],
            ['>14', ergebnis.abwesenheiten.a14],
            ['>24', ergebnis.abwesenheiten.a24],
          ]}
        />
      )}
      {ergebnis.steuerfreieAbwesenheiten !== null && (
        <SchwellenZeilen
          praefix="steuerfrei"
          eintraege={[
            ['>8', ergebnis.steuerfreieAbwesenheiten.s8],
            ['>14', ergebnis.steuerfreieAbwesenheiten.s14],
          ]}
        />
      )}
    </>
  ),
};

export default berechnung;
