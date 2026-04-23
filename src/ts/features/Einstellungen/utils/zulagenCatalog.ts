export interface IZulageCatalogItem {
  code: string;
  paymentHint: string;
  label: string;
}

export const ZULAGEN_CATALOG: IZulageCatalogItem[] = [
  {
    code: '040',
    paymentHint: 'Fahrentschaedigung',
    label: 'Fahrentschädigung nach Paragraph 23 FGr 1,2,4,5-TV',
  },
  { code: '811', paymentHint: 'B', label: 'Erschütterungsarbeiten' },
  { code: '818', paymentHint: 'B', label: 'Körperzwangshaltung in Kanälen, Schächten etc.' },
  { code: '819', paymentHint: 'B', label: 'Körperzwangshaltung an schwer zugänglichen Stellen' },
  { code: '820', paymentHint: 'B', label: 'Arbeiten in freien Höhen über 5m' },
  { code: '821', paymentHint: 'B', label: 'Arbeiten im Tunnel bis 3500 m' },
  { code: '822', paymentHint: 'B', label: 'Gefahrgeneigte Arbeiten an steilen Böschungen und Hängen' },
  { code: '823', paymentHint: 'B', label: 'Arbeiten bei 40 - 50 Grad Celsius Lufttemperatur' },
  { code: '824', paymentHint: 'B', label: 'Arbeiten bei Lufttemperaturen von unter -15 Grad Celsius' },
  { code: '826', paymentHint: 'B', label: 'Arbeiten unter außergewöhnlicher Schmutzeinwirkung' },
  { code: '827', paymentHint: 'B', label: 'Tragen von Schutzanzügen' },
  { code: '828', paymentHint: 'B', label: 'Besondere Belastung infolge Personen- und Tierunfall' },
  { code: '831', paymentHint: 'C', label: 'Arbeiten in freien Höhen über 10 m' },
  { code: '832', paymentHint: 'C', label: 'Arbeiten im Tunnel über 3500 m' },
  { code: '834', paymentHint: 'C', label: 'Arbeiten bei mehr als 50 Grad' },
  { code: '835', paymentHint: 'C', label: 'Tragen von Vollatemschutzgeräte' },
  { code: '837', paymentHint: 'C+A', label: 'Arbeiten in freien Höhen über 20 m' },
  { code: '838', paymentHint: 'C+B', label: 'Arbeiten in freien Höhen über 40 m' },
  {
    code: '839',
    paymentHint: 'C*9',
    label: 'Arbeiten zur beschleunigten Behebung von Betriebsstörungen (nur 1x pro Tag)',
  },
  { code: '841', paymentHint: 'A', label: 'Gefahrgeneigte Arbeiten in der Nähe von 15 kV Oberleitungen' },
  { code: '842', paymentHint: 'A', label: 'Tragen von Gehörschutz' },
  { code: '843', paymentHint: 'A', label: 'Tragen von Atemschutz' },
  {
    code: '846',
    paymentHint: 'SIPO',
    label: '18c Arbeiten während des Betriebs ohne Sipo innerhalb des Gleis- oder Weichenbereichs',
  },
];
