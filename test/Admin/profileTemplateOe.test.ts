import { describe, expect, it } from 'bun:test';
import {
  normalizePrimitiveRecord,
  buildTemplatePayload,
} from '@/features/Admin/components/AdminProfileTemplatesManager';
import type { TemplateContentDraft } from '@/features/Admin/components/profileTemplates.shared';

function draftWith(pers: Record<string, string>): TemplateContentDraft {
  return {
    Pers: pers,
    Arbeitszeit: null,
    Fahrzeit: [],
    VorgabenB: [],
    Einstellungen: { aktivierteTabs: [], benoetigteZulagen: [] },
  };
}

describe('ProfileTemplate: OE-Ebenen im Formular', () => {
  describe('normalizePrimitiveRecord', () => {
    it('zeigt die OE als zusammengesetzten Text', () => {
      const result = normalizePrimitiveRecord({ Vorname: 'Max', OE: ['V', 'IW', 'MI', 'M', 'KSL', 'IL', '03'] });

      expect(result.OE).toBe('V.IW-MI-M-KSL-IL 03');
      expect(result.Vorname).toBe('Max');
    });

    // Ohne die Sonderbehandlung fiele das Array durch den Primitiv-Filter und
    // wäre beim nächsten Speichern aus der Vorlage verschwunden.
    it('verliert die OE nicht, weil sie kein primitiver Wert ist', () => {
      expect(normalizePrimitiveRecord({ OE: ['V', 'IW'] })).toHaveProperty('OE');
    });

    it('kommt mit fehlender OE zurecht', () => {
      expect(normalizePrimitiveRecord({ Vorname: 'Max' }).OE).toBeUndefined();
    });
  });

  describe('buildTemplatePayload', () => {
    it('schickt die OE als Ebenen-Array zurück', () => {
      const payload = buildTemplatePayload(undefined, draftWith({ OE: 'V.IW-MI-M-KSL-IL 03', Vorname: 'Max' }));

      expect(payload?.Pers?.OE).toEqual(['V', 'IW', 'MI', 'M', 'KSL', 'IL', '03']);
      expect(payload?.Pers?.Vorname).toBe('Max');
    });

    it('lässt Pers ohne OE unverändert', () => {
      const payload = buildTemplatePayload(undefined, draftWith({ Vorname: 'Max' }));

      expect(payload?.Pers).toEqual({ Vorname: 'Max' });
    });

    it('überträgt eine geladene Vorlage unverändert zurück', () => {
      const original = { Pers: { Vorname: 'Max', OE: ['V', 'IW', 'MI'] } };
      const draft = draftWith(normalizePrimitiveRecord(original.Pers));

      expect(buildTemplatePayload(original, draft)?.Pers).toEqual(original.Pers);
    });
  });
});
