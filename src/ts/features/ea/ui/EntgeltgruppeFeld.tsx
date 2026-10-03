import { DBInput } from '@db-ux/react-core-components';

import { STANDARD_UNGUELTIG_MELDUNG } from '@/shared/ui/form/dbFeldHelfer';
import { validateOptionalTextInput } from '@/shared/lib/validation/addressValidation';
import { ENTGELTGRUPPE_LABEL } from '../model/entgeltgruppe';

/**
 * Pers-Feld „Entgeltgruppe“ im Panel „Persönliche Daten“ (Einstellungen-Slot `PersFelder` des EA). Die Grund-Entgeltgruppe
 * dient als Vorschlag fuer neue EA-Eintraege (`suggestNextEntgeltgruppe`); `read`/`collect` greifen ueber `#Entgeltgruppe` zu.
 *
 * @param props - `versteckt`: EA ist in den Einstellungen abgewaehlt -- ausblenden, Wert bleibt im DOM und wird weiter gesammelt.
 */
export default function EntgeltgruppeFeld({ versteckt }: { versteckt: boolean }) {
  return (
    <div className="sp-md-6" hidden={versteckt}>
      <DBInput
        id="Entgeltgruppe"
        label={ENTGELTGRUPPE_LABEL}
        showLabel
        variant="floating"
        icon="person"
        type="text"
        placeholder="105"
        invalidMessage={STANDARD_UNGUELTIG_MELDUNG}
        onInput={event => validateOptionalTextInput(event.currentTarget, ENTGELTGRUPPE_LABEL, { normalize: false })}
        onBlur={event => validateOptionalTextInput(event.currentTarget, ENTGELTGRUPPE_LABEL)}
      />
    </div>
  );
}
