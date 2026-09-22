import type { FeatureParts } from '@/shared/lib/feature';
import { baueEaPdfDaten } from '../utils/pdfDaten';

/** PDF-Teil des Features EA: baut die Nutzdaten des Formulars (Tabellen des Exportmonats plus vorberechnete Werte). */
const pdf: FeatureParts['pdf'] = { baueDaten: baueEaPdfDaten };

export default pdf;
