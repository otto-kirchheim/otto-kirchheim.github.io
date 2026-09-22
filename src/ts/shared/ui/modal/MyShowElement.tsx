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
  divClass = 'raster mb-1',
  labelClass = 'sp-3 text-wrap fw-bold',
  spanClass = 'sp-9 align-middle text-break my-auto',
  title,
  id,
  text = '\u00A0',
}) => {
  return (
    <div className={divClass}>
      <label className={labelClass} htmlFor={id}>
        {title}
      </label>
      <span className={spanClass} id={id}>
        {text?.toString() ?? '\u00A0'}
      </span>
    </div>
  );
};
export default MyShowElement;
