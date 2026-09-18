import { useState } from 'react';
import type { ReactNode } from 'react';
import { DBCheckbox } from '@db-ux/react-core-components';
import { ZULAGEN_CATALOG, ZULAGEN_CATEGORY_MAX_SELECTIONS, ZulageCategory } from '../utils/zulagenCatalog';

const categoryDisplayOrder: ZulageCategory[] = [
  ZulageCategory.Erschwerniszulage,
  ZulageCategory.LeistungspramieUndFahrentschaedigung,
  ZulageCategory.Ganzkoerperreinigung,
];

function getCategoryLabel(category: ZulageCategory): string {
  switch (category) {
    case ZulageCategory.Erschwerniszulage:
      return 'Erschwerniszulagen';
    case ZulageCategory.LeistungspramieUndFahrentschaedigung:
      return 'Leistungsprämie u. Fahrentschädigung';
    case ZulageCategory.Ganzkoerperreinigung:
      return 'Ganzkörperreinigung';
    default:
      return 'Zulagen';
  }
}

/** Katalog-Reihenfolge, bis das Kategorie-Limit erreicht ist -- identisch zur bisherigen Logik. */
function computeInitialChecked(benoetigteZulagen: string[] | undefined): Record<string, boolean> {
  const selectedCodes = new Set(benoetigteZulagen ?? []);
  const countByCategory = new Map<ZulageCategory, number>();
  const checked: Record<string, boolean> = {};

  for (const zulage of ZULAGEN_CATALOG) {
    if (!selectedCodes.has(zulage.code)) continue;
    const count = countByCategory.get(zulage.category) ?? 0;
    if (count >= ZULAGEN_CATEGORY_MAX_SELECTIONS[zulage.category]) continue;
    checked[zulage.code] = true;
    countByCategory.set(zulage.category, count + 1);
  }

  return checked;
}

/**
 * Zulagen-Checkboxenliste (Einstellungen > Zulagen), gruppiert per Kategorie mit
 * Selektions-Limit je Kategorie (`ZULAGEN_CATEGORY_MAX_SELECTIONS`). Ersetzt die vormalige
 * `document.createElement`-Konstruktion in `generateEingabeMaskeEinstellungen.ts` -- gemountet
 * per `mount()` in `#settings-zulagen-list`, analog `ArbeitszeiteingabePanel`/`FahrzeitenPanel`.
 * `id`/`data-zulage-code`/`data-zulage-category` bleiben unveraendert, `saveEinstellungen.ts`
 * liest weiterhin per DOM-Query aus derselben `#settings-zulagen-list`-Verschachtelung.
 */
export default function ZulagenCheckboxList({ benoetigteZulagen }: { benoetigteZulagen?: string[] }): ReactNode {
  const [checkedByCode, setCheckedByCode] = useState<Record<string, boolean>>(() =>
    computeInitialChecked(benoetigteZulagen),
  );

  const countByCategory = new Map<ZulageCategory, number>();
  for (const zulage of ZULAGEN_CATALOG) {
    if (checkedByCode[zulage.code])
      countByCategory.set(zulage.category, (countByCategory.get(zulage.category) ?? 0) + 1);
  }

  function toggle(code: string): void {
    setCheckedByCode(prev => ({ ...prev, [code]: !prev[code] }));
  }

  return (
    <>
      {categoryDisplayOrder.map(category => {
        const selectedCount = countByCategory.get(category) ?? 0;
        const maxSelections = ZULAGEN_CATEGORY_MAX_SELECTIONS[category];
        const disableUnchecked = selectedCount >= maxSelections;

        return (
          <div key={category} className="mb-3" data-zulage-category-section={category}>
            <div className="fw-semibold">{getCategoryLabel(category)}</div>
            <small className="text-body-secondary d-block mb-2">Max. {maxSelections} gleichzeitig</small>
            <div>
              {ZULAGEN_CATALOG.filter(zulage => zulage.category === category).map(zulage => {
                const checked = Boolean(checkedByCode[zulage.code]);
                return (
                  <DBCheckbox
                    key={zulage.code}
                    label={`${zulage.code} - ${zulage.label}`}
                    id={`zulage-${zulage.code}`}
                    data-zulage-code={zulage.code}
                    data-zulage-category={zulage.category}
                    checked={checked}
                    disabled={disableUnchecked && !checked}
                    onChange={() => toggle(zulage.code)}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}
