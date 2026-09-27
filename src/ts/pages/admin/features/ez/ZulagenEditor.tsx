import { DBCheckbox, DBStack } from '@db-ux/react-core-components';

import { ZULAGEN_CATALOG } from '@/shared/lib/zulagen/zulagenCatalog';
import type { AdminVorlagenEditorProps } from '../../adminFeatures';

/**
 * Editor der benoetigten Zulagen (eine Checkbox je Zulage aus dem Katalog).
 *
 * @param props - Entwurf (`value`) und `onChange`.
 */
export default function ZulagenEditor({ templateId, value, onChange }: AdminVorlagenEditorProps<string[]>) {
  /**
   * Schaltet eine Zulage um.
   *
   * @param code - Zulagen-Code.
   */
  const umschalten = (code: string) =>
    onChange(value.includes(code) ? value.filter(c => c !== code) : [...value, code].sort());

  return (
    <div className="border p-2 mb-2">
      <label className="small mb-1">Benötigte Zulagen</label>
      <DBStack direction="row" wrap gap="x-small">
        {ZULAGEN_CATALOG.map(zulage => (
          <DBCheckbox
            className="m-0"
            size="small"
            key={`${templateId}-zulage-${zulage.code}`}
            label={zulage.code}
            checked={value.includes(zulage.code)}
            onChange={() => umschalten(zulage.code)}
          />
        ))}
      </DBStack>
    </div>
  );
}
