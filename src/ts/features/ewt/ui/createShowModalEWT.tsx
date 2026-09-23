import type { ChangeEvent } from 'react';
import type { Column, Row } from '@/shared/ui/custom-table/CustomTable';
import MyCheckbox from '@/shared/ui/form/MyCheckbox';
import MyDivModal from '@/shared/ui/modal/MyDivModal';
import MyModalBody from '@/shared/ui/modal/MyModalBody';
import MyShowElement from '@/shared/ui/modal/MyShowElement';
import MyShowFooter from '@/shared/ui/modal/MyShowFooter';
import showModal from '@/shared/ui/modal/showModal';
import type { CustomHTMLDivElement, IDatenEWT } from '@/types';
import dayjs from '@/shared/lib/date/configDayjs';
import { persistEwtTableData } from '../model';
import { DBDivider, DBHeadingH5 } from '@db-ux/react-core-components';

/**
 * Sucht eine Spaltendefinition der EWT-Tabelle.
 *
 * @param row - Zeile, deren Spalten durchsucht werden.
 * @param columnName - Spaltenname (`name`).
 * @returns Die gefundene Spalte.
 * @throws {Error} Wenn die Spalte nicht existiert.
 */
const getColumn = (row: Row<IDatenEWT>, columnName: string): Column<IDatenEWT> => {
  const column = row.columns.array.find(column => column.name === columnName);
  if (!column) throw Error(`Spalte ${columnName} nicht gefunden`);
  return column;
};

/**
 * Erzeugt die Tag-Zeile; weicht der Buchungstag vom Tag ab, wird er als `Tag -> Buchungstag` angehängt.
 *
 * @param row - Anzuzeigende EWT-Zeile.
 * @returns Das `MyShowElement` für den Tag.
 */
const createTagElement = (row: Row<IDatenEWT>) => {
  const column: Column<IDatenEWT> = getColumn(row, 'Tag');
  const tag = dayjs(row.cells.Tag);
  const buchungstagRaw = row.cells.Buchungstag || row.cells.Tag;
  const buchungstag = dayjs(buchungstagRaw);
  const istAbweichend = buchungstag.isValid() && !buchungstag.isSame(tag, 'day');

  const tagColumn: Column<IDatenEWT> = getColumn(row, 'Tag');
  const buchungstagText = istAbweichend ? tagColumn.parser(buchungstagRaw) : '';
  const tagText = `${column.parser(row.cells['Tag'])}${istAbweichend ? ` -> ${buchungstagText}` : ''}`;

  return (
    <MyShowElement
      divClass="raster mb-1"
      labelClass="sp-4 sp-sm-5 text-wrap fw-bold"
      spanClass="sp-8 sp-sm-7 align-middle text-break my-auto"
      title={`${column.title}:`}
      id="Tag"
      text={tagText}
    />
  );
};

/**
 * Erzeugt eine Anzeigezeile für eine Textspalte (Einsatzort bzw. Schicht).
 *
 * @param row - Anzuzeigende EWT-Zeile.
 * @param columnName - Spaltenname (`Einsatzort` oder `Schicht`).
 * @returns Das `MyShowElement` mit dem geparsten Zellwert.
 */
const createOrtSchichtElement = (row: Row<IDatenEWT>, columnName: string) => {
  const column: Column<IDatenEWT> = getColumn(row, columnName);
  return (
    <MyShowElement
      labelClass="sp-4 sp-sm-5 text-wrap fw-bold"
      spanClass="sp-8 sp-sm-7 align-middle text-break my-auto"
      title={`${column.title}:`}
      id={column.name}
      text={column.parser(row.cells[column.name]) ?? '\u00A0'}
    />
  );
};

/**
 * Erzeugt einen Zeit-Block: Richtungskürzel und Zeitwert stehen links bzw. rechts auf derselben
 * senkrechten Linie wie die Pfeile darüber (`.ewt-zeit`-Raster, feste Außenspalten).
 *
 * @param row - Anzuzeigende EWT-Zeile.
 * @param vor - Richtungskürzel links (z. B. "ab").
 * @param titel - Überschrift des Blocks.
 * @param nach - Richtungskürzel rechts (z. B. "an").
 * @param feldLinks - Spaltenname des linken Zeitwerts.
 * @param feldRechts - Spaltenname des rechten Zeitwerts.
 * @returns Das Raster-Element des Blocks.
 */
const createZeitBlock = (
  row: Row<IDatenEWT>,
  vor: string,
  titel: string,
  nach: string,
  feldLinks: string,
  feldRechts: string,
) => {
  const links = getColumn(row, feldLinks);
  const rechts = getColumn(row, feldRechts);
  return (
    <div className="ewt-zeit">
      <span className="ewt-zeit-links">{vor}</span>
      <DBHeadingH5 paragraphSpacing className="ewt-zeit-titel text-truncate">
        {titel}
      </DBHeadingH5>
      <span className="ewt-zeit-rechts">{nach}</span>
      <span className="ewt-zeit-links" id={links.name}>
        {links.parser(row.cells[feldLinks])}
      </span>
      <span className="ewt-zeit-rechts" id={rechts.name}>
        {rechts.parser(row.cells[feldRechts])}
      </span>
    </div>
  );
};

/**
 * Öffnet das Anzeige-Modal einer EWT-Zeile (Tag, Einsatzort, Schicht, alle Zeiten). Der
 * "Berechnen?"-Schalter ist auch hier änderbar und wird sofort persistiert.
 *
 * @param row - Anzuzeigende Zeile.
 * @param titel - Modal-Titel.
 */
export default function ShowModalEWT(row: Row<IDatenEWT>, titel: string): void {
  const modal: CustomHTMLDivElement<IDatenEWT> = showModal(
    <MyDivModal
      title={titel}
      Footer={<MyShowFooter row={row} />}
      errorMessage={row.isError ? (row._errorMessage ?? undefined) : undefined}
    >
      <MyModalBody>
        {/* Tag-Zeile + "Berechnen?"-Schalter teilen eine Flex-Zeile: der Schalter sitzt oben
            rechts, ohne eine eigene Rasterzeile zu belegen. */}
        <div className="ewt-kopf">
          {createTagElement(row)}
          <MyCheckbox
            schalter
            className="ewt-kopf-schalter"
            id={'berechnen'}
            defaultChecked={row.cells?.['berechnen'] ?? true}
            changeHandler={(e: ChangeEvent<HTMLInputElement>) => {
              // `val()` statt direkter `cells`-Mutation: setzt den Row-State auf 'modified' und
              // meldet die Änderung an AutoSave, wie der Checkbox-Handler der Tabelle
              // (`attachBerechnenToggleListeners`).
              row.val({ ...row.cells, berechnen: e.target.checked });
              persistEwtTableData(row.CustomTable);
            }}
          >
            {row.columns.array.find(column => column.name === 'berechnen')?.title ?? 'Berechnen?'}
          </MyCheckbox>
        </div>
        {createOrtSchichtElement(row, 'Einsatzort')}
        {createOrtSchichtElement(row, 'Schicht')}
        <DBDivider width="full" className="ewt-trenner" />

        <div className="ewt-zeit ewt-zeit-pfeile">
          <span className="db-icon db-font-size-lg ewt-zeit-links" data-icon="arrow_down" />
          <span className="db-icon db-font-size-lg ewt-zeit-rechts" data-icon="arrow_up" />
        </div>

        {createZeitBlock(row, 'ab', 'Wohnung', 'an', 'abWE', 'anWE')}
        {createZeitBlock(row, 'von', 'Arbeitszeit', 'bis', 'beginE', 'endeE')}
        {createZeitBlock(row, 'ab', '1. Tätigkeitsstätte', 'an', 'ab1E', 'an1E')}
        {createZeitBlock(row, 'an', 'Einsatzort', 'ab', 'anEE', 'abEE')}
      </MyModalBody>
    </MyDivModal>,
  );

  modal.row = row;
}
