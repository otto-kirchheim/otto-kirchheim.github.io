import VorgabenBTable from '@/features/Einstellungen/components/VorgabenBTable';

/** Inhalt des Abschnitts "Bereitschaft": die Voreinstellungs-Tabelle `#tableVE` (Einsatzzeiträume). */
export default function BereitschaftAbschnitt() {
  return (
    <div className="raster abstand-3">
      <div className="db-table" data-width="full" data-variant="zebra" data-divider="both" data-size="small">
        <VorgabenBTable />
      </div>
    </div>
  );
}
