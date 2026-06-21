import { describe, expect, it } from 'bun:test';

import mergeSchichtenOverrides from '@/features/Bereitschaft/utils/mergeSchichtenOverrides';

describe('mergeSchichtenOverrides', () => {
  it('liefert undefined-Einträge, wenn weder base noch runtime die Schicht definieren', () => {
    const result = mergeSchichtenOverrides(undefined, undefined);
    expect(result).toEqual({ frueh: undefined, spaet: undefined, nacht: undefined, sonder: undefined });
  });

  it('übernimmt base, wenn runtime fehlt', () => {
    const base = { frueh: { default: { beginn: '07:00', ende: '15:45', pause: 30 } } };
    expect(mergeSchichtenOverrides(base, undefined)?.frueh).toEqual(base.frueh);
  });

  it('lässt runtime je Schicht gewinnen und merged default/overrides', () => {
    const base = {
      frueh: { default: { beginn: '07:00', ende: '15:45', pause: 30 }, overrides: { 5: { ende: '13:00' } } },
    };
    const runtime = {
      frueh: { default: { beginn: '07:00', ende: '16:00', pause: 30 }, overrides: { 2: { ende: '16:30' } } },
    };
    const merged = mergeSchichtenOverrides(base, runtime)?.frueh;
    expect(merged?.default).toEqual({ beginn: '07:00', ende: '16:00', pause: 30 });
    // overrides aus base (Fr) und runtime (Di) werden vereint
    expect(merged?.overrides).toEqual({ 5: { ende: '13:00' }, 2: { ende: '16:30' } });
  });

  it('mischt verschiedene Schichten aus base und runtime', () => {
    const base = { frueh: { default: { beginn: '07:00', ende: '15:45', pause: 30 } } };
    const runtime = { nacht: { default: { beginn: '19:45', ende: '06:15', pause: 45 } } };
    const merged = mergeSchichtenOverrides(base, runtime);
    expect(merged?.frueh).toEqual(base.frueh);
    expect(merged?.nacht).toEqual(runtime.nacht);
    expect(merged?.spaet).toBeUndefined();
  });
});
