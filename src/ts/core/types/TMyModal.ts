import type React from 'react';
import type { HelpContextKey } from '@/core/help/helpContent';

export type TMyModal<T> = {
  myRef: React.RefObject<T | null>;
  title: string;
  helpContext?: HelpContextKey;
  size?:
    | 'sm'
    | 'lg'
    | 'xl'
    | 'fullscreen'
    | 'fullscreen-sm-down'
    | 'fullscreen-md-down'
    | 'fullscreen-lg-down'
    | 'fullscreen-xl-down'
    | 'fullscreen-xxl-down';
  /** Zusätzliche Klassen auf `.modal-dialog` (z.B. `modal-xl modal-fullscreen-lg-down`). */
  dialogClass?: string;
  submitText?: string;
  customButtons?: React.ReactNode[];
  onSubmit: React.SubmitEventHandler<T>;
  Footer?: React.ReactNode;
  Header?: React.ReactNode;
  errorMessage?: string;
  /** React 19 vererbt `children` nicht mehr implizit an FC-Props (Preact tat das). */
  children?: React.ReactNode;
};
