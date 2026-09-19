import type { ChangeEvent } from 'react';
import type { Column, Row } from '@/infrastructure/table/CustomTable';
import { MyCheckbox, MyDivModal, MyModalBody, MyShowElement, MyShowFooter, showModal } from '@/components';
import type { CustomHTMLDivElement, IDatenEWT } from '@/types';
import dayjs from '@/infrastructure/date/configDayjs';
import { persistEwtTableData } from '../utils';
import { DBDivider, DBHeadingH5 } from '@db-ux/react-core-components';

const getColumn = (row: Row<IDatenEWT>, columnName: string): Column<IDatenEWT> => {
  const column = row.columns.array.find(column => column.name === columnName);
  if (!column) throw Error(`Spalte ${columnName} nicht gefunden`);
  return column;
};

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

// Ein Zeit-Block: Richtungskuerzel + Zeitwert stehen links bzw. rechts auf einer senkrechten
// Linie -- dieselbe wie die Pfeile darueber (`.ewt-zeit`-Raster, feste Aussenspalten).
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
              // `row` kommt aus dem Aufruf-Closure -- der fruehere `closest('.modal')`-Umweg
              // ging ins Leere (`#modal` ist eine Id, keine Klasse) -> Schalter ohne Wirkung.
              // `val()` statt direkter `cells`-Mutation: setzt den Row-State auf 'modified'
              // und meldet die Aenderung an AutoSave -- genau wie der Checkbox-Handler der
              // Tabelle (`attachBerechnenToggleListeners`).
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
