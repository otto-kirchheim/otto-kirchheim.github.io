import type { Row } from '@/shared/ui/custom-table/CustomTable';
import MyDivModal from '@/shared/ui/modal/MyDivModal';
import MyModalBody from '@/shared/ui/modal/MyModalBody';
import MyShowElement from '@/shared/ui/modal/MyShowElement';
import MyShowFooter from '@/shared/ui/modal/MyShowFooter';
import showModal from '@/shared/ui/modal/showModal';
import type { CustomHTMLDivElement, IVorgabenUvorgabenB } from '@/types';
import { DBDivider, DBHeadingH6, DBInfotext } from '@db-ux/react-core-components';

/**
 * Rendert ein Label-Wert-Paar für eine Spalte der Zeile.
 *
 * @param row - VorgabenB-Zeile.
 * @param columnName - Name der Spalte, deren geparster Wert angezeigt wird.
 * @param falseparser - Wird als Option an den Spalten-Parser gereicht.
 * @returns Anzeige-Zeile mit Spaltentitel und Wert.
 * @throws {Error} Wenn die Spalte nicht existiert.
 */
const createShowElement = (row: Row<IVorgabenUvorgabenB>, columnName: string, falseparser?: false) => {
  const column = row.columns.array.find(column => column.name === columnName);
  if (!column) throw Error(`Spalte ${columnName} nicht gefunden`);
  return (
    <MyShowElement
      divClass="anzeige-zeile"
      title={`${column.title}:`}
      id={column.name}
      text={column.parser(row.cells[column.name], falseparser)}
    />
  );
};

/**
 * Rendert den Abschnitt "Bereitschaft".
 *
 * @param row - VorgabenB-Zeile.
 * @returns Abschnitt mit Bereitschaftsbeginn und -ende.
 */
const createBereitschaftBlock = (row: Row<IVorgabenUvorgabenB>) => {
  return (
    <>
      <DBHeadingH6 paragraphSpacing className="anzeige-abschnitt">
        Bereitschaft
      </DBHeadingH6>
      {createShowElement(row, 'beginnB', false)}
      {createShowElement(row, 'endeB', false)}
    </>
  );
};

/**
 * Rendert den Abschnitt "Nachtschicht".
 *
 * @param row - VorgabenB-Zeile.
 * @returns Abschnitt mit Nachtschicht-Flag und, falls aktiv, Nachtbeginn und -ende; sonst ein Hinweis.
 */
const createNachtschichtBlock = (row: Row<IVorgabenUvorgabenB>) => {
  const isNacht = Boolean(row.cells.nacht);

  return (
    <>
      <DBHeadingH6 paragraphSpacing className="anzeige-abschnitt">
        Nachtschicht
      </DBHeadingH6>
      {createShowElement(row, 'nacht')}
      {isNacht ? (
        <>
          {createShowElement(row, 'beginnN', false)}
          {createShowElement(row, 'endeN', false)}
        </>
      ) : (
        <DBInfotext showIcon={false}>Keine Nachtschicht aktiviert.</DBInfotext>
      )}
    </>
  );
};

/**
 * Öffnet das schreibgeschützte Modal einer Bereitschafts-Vorgabe (Name, Standard, Bereitschaft, Nachtschicht).
 *
 * @param row - Anzuzeigende VorgabenB-Zeile.
 * @param titel - Modal-Titel.
 */
export default function ShowModalVE(row: Row<IVorgabenUvorgabenB>, titel: string): void {
  const modal: CustomHTMLDivElement<IVorgabenUvorgabenB> = showModal<IVorgabenUvorgabenB>(
    <MyDivModal title={titel} Footer={<MyShowFooter row={row} />}>
      <MyModalBody>
        {createShowElement(row, 'Name')}
        {createShowElement(row, 'standard')}
        <DBDivider width="full" />
        {createBereitschaftBlock(row)}
        <DBDivider width="full" />
        {createNachtschichtBlock(row)}
      </MyModalBody>
    </MyDivModal>,
  );

  modal.row = row;
}
