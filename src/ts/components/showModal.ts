import Modal from 'bootstrap/js/dist/modal';
import { type ReactNode } from 'react';
import { mount, unmount } from '@/infrastructure/ui';

import type { CustomHTMLDivElement } from '@/types';
import type { CustomTableTypes } from '@/infrastructure/table/CustomTable';

function resetModalProperties<T extends CustomTableTypes>(modal: CustomHTMLDivElement<T>): void {
  modal.row = null;
  modal.role = 'document';
  modal.innerHTML = '';
}

export default function showModal<T extends CustomTableTypes>(children: ReactNode): CustomHTMLDivElement<T> {
  const modal = document.querySelector<CustomHTMLDivElement<T>>('#modal');
  if (!modal) throw new Error('Element nicht gefunden');

  if (modal.row !== null) resetModalProperties(modal);

  mount(modal, children);

  Modal.getOrCreateInstance(modal).show();

  modal.addEventListener(
    'hide.bs.modal',
    () => {
      unmount(modal);
      resetModalProperties(modal);
    },
    { once: true },
  );

  return modal;
}
