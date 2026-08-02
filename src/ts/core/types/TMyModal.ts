import type React from 'preact';
import type { HelpContextKey } from '@/core/help/helpContent';

export type TMyModal<T> = {
  myRef: React.RefObject<T>;
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
  customButtons?: React.ComponentChild[];
  onSubmit: (this: T, event: Event) => void;
  Footer?: React.ComponentChild;
  Header?: React.ComponentChild;
  errorMessage?: string;
};
