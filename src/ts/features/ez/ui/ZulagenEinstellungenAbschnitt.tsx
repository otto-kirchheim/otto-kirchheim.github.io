import { DBInfotext, DBStack } from '@db-ux/react-core-components';

/** Inhalt des Abschnitts "Zulagen": Container, in den `read` die `ZulagenCheckboxList` mountet. */
export default function ZulagenAbschnitt() {
  return (
    <DBStack gap="x-small" alignment="start">
      <DBInfotext showIcon={false}>Wähle die benötigten Zulagen für die Nebengeld-Erfassung.</DBInfotext>
      <div id="settings-zulagen-list" className="zulagen-liste"></div>
    </DBStack>
  );
}
