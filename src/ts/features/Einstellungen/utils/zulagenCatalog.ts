export interface IZulageCatalogItem {
  code: string;
  paymentHint: string;
  label: string;
  shortLabel: string;
  category: ZulageCategory;
  entryRule: IZulageEntryRule;
}

export interface IZulageEntryRule {
  unit: ZulageEntryUnit;
  maxEntriesPerDay?: number;
  minMinutesPerDay?: number;
  calculationBlockedBelowMinimum?: boolean;
  exclusiveWithinCategoryPerDay?: boolean;
  note?: string;
}

export enum ZulageCategory {
  Erschwerniszulage = 'erschwerniszulage',
  LeistungspramieUndFahrentschaedigung = 'leistungspramie-und-fahrentschaedigung',
  Ganzkoerperreinigung = 'ganzkoerperreinigung',
}

export enum ZulageEntryUnit {
  Stueck = 'stück',
  Minuten = 'minuten',
}

export const ZULAGEN_CATEGORY_MAX_SELECTIONS: Record<ZulageCategory, number> = {
  [ZulageCategory.Erschwerniszulage]: 7,
  [ZulageCategory.LeistungspramieUndFahrentschaedigung]: 3,
  [ZulageCategory.Ganzkoerperreinigung]: 1,
};

const MINUTES_BASED_RULE: IZulageEntryRule = {
  unit: ZulageEntryUnit.Minuten,
  minMinutesPerDay: 60,
  calculationBlockedBelowMinimum: true,
};

const SINGLE_PIECE_PER_DAY_RULE: IZulageEntryRule = {
  unit: ZulageEntryUnit.Stueck,
  maxEntriesPerDay: 1,
};

export const ZULAGEN_CATALOG: IZulageCatalogItem[] = [
  {
    code: '040',
    paymentHint: 'Fahrentschaedigung',
    label: 'Fahrentschädigung nach §23 FGr 1,2,4,5-TV',
    shortLabel: 'Fahrentsch.',
    category: ZulageCategory.LeistungspramieUndFahrentschaedigung,
    entryRule: SINGLE_PIECE_PER_DAY_RULE,
  },
  {
    code: '811',
    paymentHint: 'B',
    label: 'Erschütterungsarbeiten',
    shortLabel: 'Erschütterung',
    category: ZulageCategory.Erschwerniszulage,
    entryRule: MINUTES_BASED_RULE,
  },
  {
    code: '818',
    paymentHint: 'B',
    label: 'Körperzwangshaltung in Kanälen, Schächten etc.',
    shortLabel: 'Zwangsh. Kanal',
    category: ZulageCategory.Erschwerniszulage,
    entryRule: MINUTES_BASED_RULE,
  },
  {
    code: '819',
    paymentHint: 'B',
    label: 'Körperzwangshaltung an schwer zugänglichen Stellen',
    shortLabel: 'Zwangsh. Bücken/Knieen',
    category: ZulageCategory.Erschwerniszulage,
    entryRule: MINUTES_BASED_RULE,
  },
  {
    code: '820',
    paymentHint: 'B',
    label: 'Arbeiten in freien Höhen über 5m',
    shortLabel: 'Höhe > 5m',
    category: ZulageCategory.Erschwerniszulage,
    entryRule: MINUTES_BASED_RULE,
  },
  {
    code: '821',
    paymentHint: 'B',
    label: 'Arbeiten im Tunnel bis 3500 m',
    shortLabel: 'Tu ≤ 3,5km',
    category: ZulageCategory.Erschwerniszulage,
    entryRule: MINUTES_BASED_RULE,
  },
  {
    code: '822',
    paymentHint: 'B',
    label: 'Gefahrgeneigte Arbeiten an steilen Böschungen und Hängen',
    shortLabel: 'Böschung/Hang',
    category: ZulageCategory.Erschwerniszulage,
    entryRule: MINUTES_BASED_RULE,
  },
  {
    code: '823',
    paymentHint: 'B',
    label: 'Arbeiten bei 40 - 50 Grad Celsius Lufttemperatur',
    shortLabel: '40–50 °C',
    category: ZulageCategory.Erschwerniszulage,
    entryRule: MINUTES_BASED_RULE,
  },
  {
    code: '824',
    paymentHint: 'B',
    label: 'Arbeiten bei Lufttemperaturen von unter -15 Grad Celsius',
    shortLabel: '< -15 °C',
    category: ZulageCategory.Erschwerniszulage,
    entryRule: MINUTES_BASED_RULE,
  },
  {
    code: '826',
    paymentHint: 'B',
    label: 'Arbeiten unter außergewöhnlicher Schmutzeinwirkung',
    shortLabel: 'Schmutz',
    category: ZulageCategory.Erschwerniszulage,
    entryRule: MINUTES_BASED_RULE,
  },
  {
    code: '827',
    paymentHint: 'B',
    label: 'Tragen von Schutzanzügen',
    shortLabel: 'Schutzanzug',
    category: ZulageCategory.Erschwerniszulage,
    entryRule: MINUTES_BASED_RULE,
  },
  {
    code: '828',
    paymentHint: 'B',
    label: 'Besondere Belastung infolge Personen- und Tierunfall',
    shortLabel: 'Unfall/Kadaver',
    category: ZulageCategory.Erschwerniszulage,
    entryRule: MINUTES_BASED_RULE,
  },
  {
    code: '831',
    paymentHint: 'C',
    label: 'Arbeiten in freien Höhen über 10 m',
    shortLabel: 'Höhe > 10m',
    category: ZulageCategory.Erschwerniszulage,
    entryRule: MINUTES_BASED_RULE,
  },
  {
    code: '832',
    paymentHint: 'C',
    label: 'Arbeiten im Tunnel über 3500 m',
    shortLabel: 'Tu > 3,5km',
    category: ZulageCategory.Erschwerniszulage,
    entryRule: MINUTES_BASED_RULE,
  },
  {
    code: '834',
    paymentHint: 'C',
    label: 'Arbeiten bei mehr als 50 Grad',
    shortLabel: '> 50 °C',
    category: ZulageCategory.Erschwerniszulage,
    entryRule: MINUTES_BASED_RULE,
  },
  {
    code: '835',
    paymentHint: 'C',
    label: 'Tragen von Vollatemschutzgeräte',
    shortLabel: 'Vollatemschutz',
    category: ZulageCategory.Erschwerniszulage,
    entryRule: MINUTES_BASED_RULE,
  },
  {
    code: '837',
    paymentHint: 'C+A',
    label: 'Arbeiten in freien Höhen über 20 m',
    shortLabel: 'Höhe > 20m',
    category: ZulageCategory.Erschwerniszulage,
    entryRule: MINUTES_BASED_RULE,
  },
  {
    code: '838',
    paymentHint: 'C+B',
    label: 'Arbeiten in freien Höhen über 40 m',
    shortLabel: 'Höhe > 40m',
    category: ZulageCategory.Erschwerniszulage,
    entryRule: MINUTES_BASED_RULE,
  },
  {
    code: '839',
    paymentHint: 'C*9',
    label: 'Arbeiten zur beschleunigten Behebung von Betriebsstörungen (nur 1x pro Tag)',
    shortLabel: 'beschl. Entstörung',
    category: ZulageCategory.Erschwerniszulage,
    entryRule: {
      unit: ZulageEntryUnit.Stueck,
      maxEntriesPerDay: 1,
      exclusiveWithinCategoryPerDay: true,
    },
  },
  {
    code: '841',
    paymentHint: 'A',
    label: 'Gefahrgeneigte Arbeiten in der Nähe von 15 kV Oberleitungen',
    shortLabel: '15kV Oberltg.',
    category: ZulageCategory.Erschwerniszulage,
    entryRule: MINUTES_BASED_RULE,
  },
  {
    code: '842',
    paymentHint: 'A',
    label: 'Tragen von Gehörschutz',
    shortLabel: 'Gehörschutz',
    category: ZulageCategory.Erschwerniszulage,
    entryRule: MINUTES_BASED_RULE,
  },
  {
    code: '843',
    paymentHint: 'A',
    label: 'Tragen von Atemschutz',
    shortLabel: 'Atemschutz',
    category: ZulageCategory.Erschwerniszulage,
    entryRule: MINUTES_BASED_RULE,
  },
  {
    code: '846',
    paymentHint: 'SIPO',
    label: '18c Arbeiten während des Betriebs ohne Sipo innerhalb des Gleis- oder Weichenbereichs',
    shortLabel: 'kein SiPo',
    category: ZulageCategory.Erschwerniszulage,
    entryRule: MINUTES_BASED_RULE,
  },
  {
    code: '218',
    paymentHint: 'Ganzkoerperreinigung',
    label: 'Ganzkörperreinigung',
    shortLabel: 'GKR',
    category: ZulageCategory.Ganzkoerperreinigung,
    entryRule: SINGLE_PIECE_PER_DAY_RULE,
  },
];
