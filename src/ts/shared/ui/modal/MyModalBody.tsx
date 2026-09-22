import { type FC, type ReactNode } from 'react';

/**
 * Dialog-Körper mit Basisklasse `dialog-koerper`.
 * Enthält am Ende das `#errorMessage`-Feld, in das Submit-Handler Fehlertexte schreiben.
 *
 * @param props - `className` ersetzt das Standard-Raster (`raster abstand-2`) vollständig; `children` ist der Dialoginhalt.
 */
const MyModalBody: FC<{ className?: string; children?: ReactNode }> = ({ className, children }) => {
  const defaultClass = 'dialog-koerper';
  const additionalClass = className ? ` ${className}` : ' raster abstand-2';

  return (
    <div className={`${defaultClass}${additionalClass}`}>
      {children}
      <div className="text-bg-danger">
        <span id="errorMessage" />
      </div>
    </div>
  );
};
export default MyModalBody;
