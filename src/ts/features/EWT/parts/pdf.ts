import type { FeatureParts } from '@/shared/lib/feature';
import { baueEwtPdfDaten } from '../utils/pdfDaten';

/** PDF-Teil des Features EWT: baut die Nutzdaten des Formulars (Tabellen des Exportmonats plus vorberechnete Werte). */
const pdf: FeatureParts['pdf'] = { baueDaten: baueEwtPdfDaten };

export default pdf;
