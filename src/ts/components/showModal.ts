import Modal from 'bootstrap/js/dist/modal';
import { render, type ComponentChild } from 'preact';
import type { CustomHTMLDivElement } from '../interfaces';
import type { CustomTableTypes } from '../infrastructure/table/CustomTable';

function resetModalProperties<T extends CustomTableTypes>(modal: CustomHTMLDivElement<T>): void {
  modal.row = null;
  modal.role = 'document';
  modal.innerHTML = '';
}

export default function showModal<T extends CustomTableTypes>(children: ComponentChild): CustomHTMLDivElement<T> {
  const modal = document.querySelector<CustomHTMLDivElement<T>>('#modal');
  if (!modal) throw new Error('Element nicht gefunden');

  if (modal.row !== null) resetModalProperties(modal);

  render(children, modal);

  Modal.getOrCreateInstance(modal).show();

  modal.addEventListener(
    'hide.bs.modal',
    () => {
      render(null, modal);
      resetModalProperties(modal);
    },
    { once: true },
  );

  return modal;
}
