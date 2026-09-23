/** Inhalt des Abschnitts "Zulagen": Container, in den `read` die `ZulagenCheckboxList` mountet. */
export default function ZulagenAbschnitt() {
  return (
    <div className="d-flex flex-column align-items-start gap-2">
      <p className="text-muted mb-0">Wähle die benötigten Zulagen für die Nebengeld-Erfassung.</p>
      <div id="settings-zulagen-list" className="w-100 d-flex flex-column gap-2"></div>
    </div>
  );
}
