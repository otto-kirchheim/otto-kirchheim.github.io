import { describe, expect, it } from 'bun:test';
import { stripMetaFields, extractMetaFields, hasPendingLocalChanges } from '@/infrastructure/data/metaFields';

describe('stripMetaFields', () => {
  it('entfernt alle __-präfixierten Felder', () => {
    const input = { a: 1, b: 'hello', __localState: 'deleted', __errorMessage: 'fail' };
    expect(stripMetaFields(input)).toEqual({ a: 1, b: 'hello' });
  });

  it('lässt normale Felder unberührt', () => {
    const input = { _id: '123', name: 'test', value: 42 };
    expect(stripMetaFields(input)).toEqual({ _id: '123', name: 'test', value: 42 });
  });

  it('lässt _-präfixierte Felder (intern) stehen', () => {
    const input = { _id: 'abc', __localState: 'deleted' };
    expect(stripMetaFields(input)).toEqual({ _id: 'abc' });
  });

  it('mutiert das Original nicht', () => {
    const input = { a: 1, __localState: 'deleted' };
    stripMetaFields(input);
    expect(input).toEqual({ a: 1, __localState: 'deleted' });
  });

  it('gibt leeres Objekt bei reinen Meta-Objekten zurück', () => {
    const input = { __localState: 'deleted', __errorMessage: 'err', __errorState: 'new' };
    expect(stripMetaFields(input)).toEqual({});
  });

  it('verarbeitet leere Objekte korrekt', () => {
    expect(stripMetaFields({})).toEqual({});
  });
});

describe('extractMetaFields', () => {
  it('extrahiert nur __-präfixierte Felder', () => {
    const input = { a: 1, __localState: 'deleted', __errorMessage: 'fail' };
    expect(extractMetaFields(input)).toEqual({ __localState: 'deleted', __errorMessage: 'fail' });
  });

  it('gibt leeres Objekt wenn keine Meta-Felder vorhanden', () => {
    const input = { a: 1, _id: 'abc' };
    expect(extractMetaFields(input)).toEqual({});
  });
});

describe('hasPendingLocalChanges', () => {
  it('erkennt pending-deleted Rows', () => {
    const rows = [{ a: 1 }, { a: 2, __localState: 'deleted' }];
    expect(hasPendingLocalChanges(rows)).toBe(true);
  });

  it('erkennt Rows mit errorMessage', () => {
    const rows = [{ a: 1, __errorMessage: 'Backend-Fehler' }];
    expect(hasPendingLocalChanges(rows)).toBe(true);
  });

  it('gibt false zurück wenn keine pending changes', () => {
    const rows = [
      { a: 1, _id: 'x' },
      { a: 2, _id: 'y' },
    ];
    expect(hasPendingLocalChanges(rows)).toBe(false);
  });

  it('gibt false für leeres Array zurück', () => {
    expect(hasPendingLocalChanges([])).toBe(false);
  });

  it('ignoriert null/non-object Einträge', () => {
    const rows = [null, undefined, 'string', 42];
    expect(hasPendingLocalChanges(rows)).toBe(false);
  });

  it('__localState !== deleted gilt nicht als pending', () => {
    const rows = [{ a: 1, __localState: 'something-else' }];
    expect(hasPendingLocalChanges(rows)).toBe(false);
  });
});
