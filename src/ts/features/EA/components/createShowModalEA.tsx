import type { Row } from '@/infrastructure/table/CustomTable';
import { MyDivModal, MyModalBody, MyShowFooter, showModal } from '@/components';
import { createShowElement3, createTagElement } from '@/components/showModalHelpers';
import type { CustomHTMLDivElement, IDatenEA } from '@/types';

export default function ShowModalEA(row: Row<IDatenEA>, titel: string): void {
  const modal: CustomHTMLDivElement<IDatenEA> = showModal(
    <MyDivModal
      title={titel}
      Footer={<MyShowFooter row={row} />}
      errorMessage={row.isError ? (row._errorMessage ?? undefined) : undefined}
    >
      <MyModalBody className="p-3">
        {createTagElement(row)}

        <h4 className="text-center mb-0">Dauer</h4>
        {createShowElement3(row, ['Dauer'])}

        <h4 className="text-center mb-0">Tätigkeit</h4>
        {createShowElement3(row, ['Taetigkeit'])}

        <h4 className="text-center mb-0">Entgeltgruppe</h4>
        {createShowElement3(row, ['Entgeltgruppe'])}
      </MyModalBody>
    </MyDivModal>,
  );

  modal.row = row;
}
