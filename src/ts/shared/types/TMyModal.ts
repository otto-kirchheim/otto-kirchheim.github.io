import type React from 'react';
import type { HelpContextKey } from '@/shared/lib/help/helpContent';

export type TMyModal<T> = {
  myRef: React.RefObject<T | null>;
  title: string;
  helpContext?: HelpContextKey;
  /**
   * Breite des Dialogs (`DBDialog` `containerSize`): ohne Angabe `medium` (32rem), `lg` = `large` (48rem), `xl` = 64rem. Auf dem Handy
   * oeffnet statt des Dialogs ein Vollbild-`DBDrawer`.
   */
  size?: 'lg' | 'xl';
  submitText?: string;
  customButtons?: React.ReactNode[];
  onSubmit: React.SubmitEventHandler<T>;
  Footer?: React.ReactNode;
  Header?: React.ReactNode;
  errorMessage?: string;
  /** Explizit deklariert: FC-Props enthalten unter React 19 kein implizites `children`. */
  children?: React.ReactNode;
};
