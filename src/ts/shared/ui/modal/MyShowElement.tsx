import type { Dayjs } from 'dayjs';
import { type FC } from 'react';

type TMyShowElement = {
  divClass?: string;
  labelClass?: string;
  spanClass?: string;
  title: string;
  id: string;
  text?: string | number | Date | Dayjs;
};

/**
 * Schreibgeschützte Label-Wert-Zeile für Anzeige-Dialoge.
 * Das geschützte Leerzeichen als Fallback hält die Zeilenhöhe bei leerem Wert stabil.
 *
 * @param props - `title` (Label), `id` (für `label`/`span`), `text` (Anzeigewert; Standard und Fallback ist ein geschütztes Leerzeichen), optionale Klassen `divClass`, `labelClass`, `spanClass`.
 */
const MyShowElement: FC<TMyShowElement> = ({
  divClass = 'raster anzeige-zeile',
  labelClass = 'sp-3',
  spanClass = 'sp-9 anzeige-zeile__wert',
  title,
  id,
  text = '\u00A0',
}) => {
  return (
    <div className={divClass}>
      <label className={labelClass} htmlFor={id}>
        <strong>{title}</strong>
      </label>
      <span className={spanClass} id={id}>
        {text?.toString() ?? '\u00A0'}
      </span>
    </div>
  );
};
export default MyShowElement;
