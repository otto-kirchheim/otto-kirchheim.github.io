import type { FeatureParts } from '@/core/hooks';
import { baueEzPdfDaten } from '../utils/pdfDaten';

/** PDF-Teil des Features EZ (Neben): baut die Nutzdaten des Formulars (Tabellen des Exportmonats plus vorberechnete Werte). */
const pdf: FeatureParts['pdf'] = { baueDaten: baueEzPdfDaten };

export default pdf;
