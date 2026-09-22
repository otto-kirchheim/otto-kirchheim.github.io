import type React from 'react';
import type { HelpContextKey } from '@/core/help/helpContent';

export type TMyModal<T> = {
  myRef: React.RefObject<T | null>;
  title: string;
  helpContext?: HelpContextKey;
  /**
   * Breite des Dialogs. Ohne Angabe 36 rem; `lg` 48 rem, `xl` 64 rem. Auf schmalen Geraeten
   * fuellt der Drawer ohnehin die volle Breite, deshalb gibt es keine Fullscreen-Stufen mehr.
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
