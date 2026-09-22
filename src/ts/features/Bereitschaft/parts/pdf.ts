import type { FeatureParts } from '@/shared/lib/feature';
import { baueBereitschaftPdfDaten } from '../utils/pdfDaten';

/** PDF-Teil des Features Bereitschaft: baut die Nutzdaten des Formulars (Tabellen des Exportmonats plus vorberechnete Werte). */
const pdf: FeatureParts['pdf'] = { baueDaten: baueBereitschaftPdfDaten };

export default pdf;
