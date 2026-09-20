import type { Row } from '@/infrastructure/table/CustomTable';
import { MyDivModal, MyModalBody, MyShowFooter, showModal } from '@/components';
import { createShowElement3, createTagElement } from '@/components/showModalHelpers';
import type { CustomHTMLDivElement, IDatenEA } from '@/types';
import { DBHeadingH4 } from '@db-ux/react-core-components';

/**
 * Öffnet das schreibgeschützte Modal mit Tag, Dauer, Tätigkeit und Entgeltgruppe einer EA-Zeile.
 *
 * @param row - Anzuzeigende EA-Zeile.
 * @param titel - Modal-Titel.
 */
export default function ShowModalEA(row: Row<IDatenEA>, titel: string): void {
  const modal: CustomHTMLDivElement<IDatenEA> = showModal(
    <MyDivModal
      title={titel}
      Footer={<MyShowFooter row={row} />}
      errorMessage={row.isError ? (row._errorMessage ?? undefined) : undefined}
    >
      <MyModalBody className="p-3">
        {createTagElement(row)}

        <DBHeadingH4 alignment="center" className="mb-0">
          Dauer
        </DBHeadingH4>
        {createShowElement3(row, ['Dauer'])}

        <DBHeadingH4 alignment="center" className="mb-0">
          Tätigkeit
        </DBHeadingH4>
        {createShowElement3(row, ['Taetigkeit'])}

        <DBHeadingH4 alignment="center" className="mb-0">
          Entgeltgruppe
        </DBHeadingH4>
        {createShowElement3(row, ['Entgeltgruppe'])}
      </MyModalBody>
    </MyDivModal>,
  );

  modal.row = row;
}
