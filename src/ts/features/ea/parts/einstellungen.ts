import type { FeatureParts } from '@/shared/lib/feature';
import { createSnackBar } from '@/shared/ui/snackbar/CustomSnackbar';
import { validateOptionalTextInput } from '@/shared/lib/validation/addressValidation';
import EntgeltgruppeFeld from '../ui/EntgeltgruppeFeld';
import { ENTGELTGRUPPE_LABEL } from '../model/entgeltgruppe';

/** Liefert das Feld `#Entgeltgruppe`, sofern gerendert. */
const feld = (): HTMLInputElement | null => document.querySelector<HTMLInputElement>('#Entgeltgruppe');

/** Einstellungen-Slot des Entgeltausgleichs: kein eigener Abschnitt, nur das Pers-Feld „Entgeltgruppe“. */
const einstellungen: FeatureParts['einstellungen'] = {
  sections: [],
  PersFelder: EntgeltgruppeFeld,

  /**
   * Traegt die gespeicherte Entgeltgruppe ein (leer, wenn keine gepflegt ist).
   *
   * @param vorgabenU - Benutzer-Vorgaben; `Pers.Entgeltgruppe` liefert den Wert.
   */
  read(vorgabenU) {
    const input = feld();
    if (input) input.value = vorgabenU.Pers.Entgeltgruppe ?? '';
  },

  /**
   * Liest die Entgeltgruppe aus und prueft sie.
   *
   * @param vorgabenU - Benutzer-Vorgaben mit den bereits eingesammelten persoenlichen Daten.
   * @returns `Pers` mit der Entgeltgruppe; leer, wenn das Feld fehlt.
   * @throws {Error} Bei ungueltigen Zeichen (mit Snackbar-Hinweis).
   */
  collect(vorgabenU) {
    const input = feld();
    if (!input) return {};

    if (!validateOptionalTextInput(input, ENTGELTGRUPPE_LABEL)) {
      createSnackBar({
        message: `Einstellungen > Persönliche Daten > "${ENTGELTGRUPPE_LABEL}": ${input.validationMessage}`,
        status: 'error',
        timeout: 4000,
        fixed: true,
      });
      input.reportValidity();
      input.focus();
      throw new Error('Persönliche Daten fehlerhaft');
    }
    return { Pers: { ...vorgabenU.Pers, Entgeltgruppe: input.value } };
  },
};

export default einstellungen;
