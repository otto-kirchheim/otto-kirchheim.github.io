import { DBStack, DBTag, type SemanticType } from '@db-ux/react-core-components';

type EntfernbareTagListeProps = {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
  semantic?: SemanticType;
};

/**
 * Beschriftete Tag-Liste, deren Einträge sich per × entfernen lassen. Hinzufügen und Ändern laufen
 * im Bearbeiten-Dialog (`AdminUserScopeModal`), hier nur Anzeige und Löschen.
 *
 * @param props - `label`, `values`/`onChange` (Liste ohne den entfernten Eintrag), `disabled`, `semantic`.
 */
export function EntfernbareTagListe({
  label,
  values,
  onChange,
  disabled = false,
  semantic = 'informational',
}: EntfernbareTagListeProps) {
  return (
    <div>
      <label className="fett zelle-klein luft-unten-2xs">{label}</label>
      <DBStack direction="row" wrap gap="2x-small">
        {values.length === 0 && <span className="farbe-gedaempft zelle-klein kursiv">Keine</span>}
        {values.map((wert, index) => (
          <DBTag
            key={`${wert}-${index}`}
            semantic={semantic}
            emphasis="strong"
            behavior={disabled ? 'static' : 'removable'}
            removeButton={`${wert} entfernen`}
            onRemove={() => onChange(values.filter((_, i) => i !== index))}
          >
            {wert}
          </DBTag>
        ))}
      </DBStack>
    </div>
  );
}
