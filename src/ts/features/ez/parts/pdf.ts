import type { FeatureParts } from '@/shared/lib/feature';
import { baueEzPdfDaten } from '../model/pdfDaten';

/** PDF-Teil des Features EZ (Neben): baut die Nutzdaten des Formulars (Tabellen des Exportmonats plus vorberechnete Werte). */
const pdf: FeatureParts['pdf'] = { baueDaten: baueEzPdfDaten };

export default pdf;
