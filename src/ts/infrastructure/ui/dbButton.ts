/**
 * Bruecke zwischen den Bootstrap-Button-Klassen im Bestand und den DB-UX-Button-Props.
 *
 * Genutzt von `components/MyButton` (React) und `infrastructure/table/customTableRender`
 * (Vanilla-DOM), damit beide Wege dieselbe Zuordnung verwenden.
 */
type DbButtonLook = {
  variant: 'brand' | 'filled' | 'outlined' | 'ghost';
  color?: 'critical' | 'informational' | 'successful' | 'warning';
  size?: 'small' | 'medium';
  width?: 'full';
  rest: string;
};

/**
 * Uebersetzt die Bootstrap-Button-Klassen der Aufrufstellen in DB-UX-Props, damit die
 * ~20 `<MyButton className="btn btn-...">` unveraendert bleiben koennen. Alles, was hier
 * nicht erkannt wird (Layout-Klassen wie `text-start`), geht als `className` weiter --
 * solange Bootstrap noch im Build ist, wirkt es dort.
 */
export function buttonLook(className: string): DbButtonLook {
  const klassen = className.split(/\s+/).filter(Boolean);
  const look: DbButtonLook = { variant: 'filled', rest: '' };
  const uebrig: string[] = [];

  for (const k of klassen) {
    switch (k) {
      case 'btn':
        break;
      case 'btn-primary':
        look.variant = 'brand';
        break;
      case 'btn-secondary':
        look.variant = 'filled';
        break;
      case 'btn-danger':
        look.variant = 'filled';
        look.color = 'critical';
        break;
      case 'btn-info':
        look.variant = 'filled';
        look.color = 'informational';
        break;
      case 'btn-success':
        look.variant = 'filled';
        look.color = 'successful';
        break;
      case 'btn-warning':
        look.variant = 'filled';
        look.color = 'warning';
        break;
      case 'btn-outline-primary':
      case 'btn-outline-secondary':
        look.variant = 'outlined';
        break;
      case 'btn-outline-info':
        look.variant = 'outlined';
        look.color = 'informational';
        break;
      case 'btn-outline-danger':
        look.variant = 'outlined';
        look.color = 'critical';
        break;
      case 'btn-link':
        look.variant = 'ghost';
        break;
      case 'btn-sm':
        look.size = 'small';
        break;
      case 'btn-lg':
        look.size = 'medium';
        break;
      case 'w-100':
        look.width = 'full';
        break;
      default:
        uebrig.push(k);
    }
  }

  look.rest = uebrig.join(' ');
  return look;
}

/**
 * Baut einen DB-Button als DOM-Element -- fuer die Stellen, die kein React nutzen
 * (Tabellen-Fuss, Zeilen-Aktionen).
 */
export function erzeugeDbButton(
  klassen: string[],
  inhalt: string,
  beiKlick: () => void,
  optionen: { titel?: string; alsHtml?: boolean } = {},
): HTMLButtonElement {
  const { variant, color, size, width, rest } = buttonLook(klassen.join(' '));
  const button = document.createElement('button');
  button.type = 'button';
  button.classList.add('db-button', ...rest.split(' ').filter(Boolean));
  button.dataset['variant'] = variant;
  if (color) button.dataset['color'] = color;
  if (size) button.dataset['size'] = size;
  if (width) button.dataset['width'] = width;

  if (optionen.alsHtml) button.innerHTML = inhalt;
  else button.innerText = inhalt;
  button.title = optionen.titel ?? (optionen.alsHtml ? '' : inhalt);

  button.addEventListener('click', event => {
    event.stopPropagation();
    event.preventDefault();
    beiKlick();
  });

  return button;
}
