import { DBButton } from '@db-ux/react-core-components';
import { createRef, type SubmitEvent } from 'react';

import type { CustomTable } from '@/shared/ui/custom-table/CustomTable';
import { createSnackBar } from '@/shared/ui/snackbar/CustomSnackbar';
import { MyFormModal, MyInput, MyModalBody, MySelect, beiModalSchliessen, showModal } from '@/components';
import { getEwtDaten } from '../../EWT/utils';
import type { CustomHTMLTableElement, IDatenEWT, IDatenN } from '@/types';
import dayjs from '@/shared/lib/date/configDayjs';
import { onEvent } from '@/core';
import { addNebengeldTag, applySelectOptions, getConfiguredNebenZulagen, getNebengeldDaten } from '../utils';

type ReturnTypeTagOptions = {
  value: string | number;
  text: string;
  disabled?: boolean;
  selected?: boolean;
};

/**
 * Baut die Optionen der Tag-Auswahl aus den EWT-Tagen; der Wert ist ein JSON mit Tag, Beginn, Ende und EWT-Id.
 * Deaktiviert sind noch nicht gespeicherte EWT-Tage (ohne `_id` oder lokal geändert) und Tage, für die schon ein
 * Nebenbezug existiert; Optionen mit gleichem Text werden nur einmal aufgeführt.
 *
 * @param dataE - EWT-Einträge des aktiven Monats.
 * @returns Select-Optionen.
 */
const getTagOptions = (dataE: IDatenEWT[]): ReturnTypeTagOptions[] => {
  const dataN = getNebengeldDaten(undefined, undefined, { scope: 'monat', excludeDeleted: true });

  const options = dataE
    .map(day => {
      const schicht = day.Schicht;
      const tagEDate = dayjs(day.Tag);
      const tag = tagEDate.format('DD | dd');
      const isUnsynced = !day._id || day.__localState === 'modified';

      const option: ReturnTypeTagOptions = {
        text: '',
        value: JSON.stringify({
          Tag: tagEDate.format('DD.MM.YYYY'),
          Beginn: day.beginE,
          Ende: day.endeE,
          Auftragsnummer: '',
          EWT: day._id,
        }),
      };

      switch (schicht) {
        case 'N':
          option.text = `${tag} | Nacht`;
          break;
        case 'BN':
          option.text = `${tag} | Nacht / Bereitschaft`;
          break;
        default:
          option.text = tag;
          break;
      }

      if (isUnsynced) {
        option.text += ' (wird noch gespeichert)';
        option.disabled = true;
      } else if (
        dataN?.some(value => {
          const nebenTagDate = dayjs(value.Tag, 'DD.MM.YYYY');
          return nebenTagDate.isValid() && nebenTagDate.isSame(tagEDate, 'day');
        })
      )
        option.disabled = true;

      return option;
    })
    .filter((option, index, self) => !self.slice(0, index).some(other => other.text === option.text));

  return options;
};

/**
 * Öffnet den Modal für einen neuen Nebenbezug zu einem EWT-Tag des aktiven Monats. Die Tag-Auswahl wird bei
 * `data:changed` für EWT aktualisiert, bis der Modal schließt.
 *
 * @param tableN - Nebenbezug-Tabelle, in die der neue Eintrag kommt.
 * @throws {Error} Wenn der Monat keine EWT-Tage hat (mit Snackbar) oder die Formular-Referenz fehlt.
 */
export default function createAddModalNeben(tableN: CustomTable<IDatenN>): void {
  const ref = createRef<HTMLFormElement>();

  const dataE = getEwtDaten(undefined, undefined, { scope: 'monat', filter: 'starttag' });
  if (dataE.length === 0) {
    createSnackBar({
      message:
        'Keine Tage im aktuellen Monat in EWT gefunden. </br></br>Bitte erst EWT ausfüllen! </br>oder Manuell über "Neue Zeile"',
      timeout: 3000,
      fixed: true,
    });
    throw new Error('Keine Tage im aktuellen Monat in EWT gefunden.');
  }

  const customFooterButton = [
    <DBButton
      key="Manuell"
      variant="filled"
      data-color="informational"
      type="button"
      data-dialog-dismiss="modal"
      onClick={() => {
        const table = document.querySelector<CustomHTMLTableElement<IDatenN>>('#tableN');
        if (!table) throw new Error('table N nicht gefunden');

        table.instance.options.editing.addRow();
      }}
    >
      Manuell
    </DBButton>,
  ];

  const configuredZulagen = getConfiguredNebenZulagen();

  showModal(
    <MyFormModal
      myRef={ref}
      title="Neuen Nebenbezug eingeben"
      helpContext="modal.neben.add"
      onSubmit={onSubmit()}
      customButtons={customFooterButton}
    >
      <MyModalBody>
        <div>
          <p className="text-center text-bg-warning p-1 mb-0">!!! Erst EWT Eingeben und Berechnen !!!</p>
        </div>
        <MySelect className="sp-sm-6" title="Tag (Aus EWT)" id="Tag" required options={getTagOptions(dataE)} />
        <MyInput
          divClass="sp-12 sp-sm-6"
          type="text"
          id="AuftragN"
          name="Auftragsnummer"
          minLength={9}
          maxLength={9}
          required
        >
          Auftragsnummer
        </MyInput>
        <div className="border p-2">
          <p className="text-muted small fw-semibold text-uppercase mb-2 ps-1">Zulagen</p>
          <div className="raster abstand-2">
            {configuredZulagen.map(zulage => (
              <MyInput
                key={zulage.code}
                divClass="sp-12 sp-sm-6"
                type="number"
                id={`zulage-${zulage.code}`}
                name={`${zulage.code} ${zulage.label}`}
                value={zulage.code === '040' ? 1 : 0}
                min={'0'}
                max={zulage.entryRule.maxEntriesPerDay ? String(zulage.entryRule.maxEntriesPerDay) : '600'}
                required={false}
                step={'1'}
                dataZulageInputCode={zulage.code}
              >
                {`${zulage.code} ${zulage.shortLabel}`}
              </MyInput>
            ))}
          </div>
        </div>
      </MyModalBody>
    </MyFormModal>,
  );

  if (ref.current === null) throw new Error('referenz nicht gesetzt');
  const form = ref.current;

  const unsubscribeEwtSync = onEvent('data:changed', ({ resource }) => {
    if (resource !== 'EWT' && resource !== 'all') return;
    const select = form.querySelector<HTMLSelectElement>('#Tag');
    if (!select) return;
    const freshDataE = getEwtDaten(undefined, undefined, { scope: 'monat', filter: 'starttag' });
    applySelectOptions(select, getTagOptions(freshDataE));
  });
  beiModalSchliessen(unsubscribeEwtSync);

  /**
   * Baut den Submit-Handler des Formulars: bei gültigem Formular wird der Nebenbezug per `addNebengeldTag` angelegt.
   *
   * @returns Submit-Handler.
   */
  function onSubmit(): (event: SubmitEvent<HTMLFormElement>) => void {
    return (event: SubmitEvent<HTMLFormElement>): void => {
      if (!form.checkValidity()) return;
      event.preventDefault();
      addNebengeldTag(form, tableN);
    };
  }
}
