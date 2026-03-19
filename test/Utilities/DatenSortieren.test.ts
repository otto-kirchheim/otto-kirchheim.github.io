import { describe, expect, it } from 'vitest';
import DatenSortieren from '../../src/ts/utilities/DatenSortieren';

describe('DatenSortieren', () => {
  it('sortiert numerisch (Standard)', () => {
    const data = [{ val: '3' }, { val: '1' }, { val: '2' }];
    DatenSortieren(data, 'val');
    expect(data.map(d => d.val)).toEqual(['1', '2', '3']);
  });

  it('sortiert Strings', () => {
    const data = [{ name: 'Charlie' }, { name: 'Alice' }, { name: 'Bob' }];
    DatenSortieren(data, 'name', 'string');
    expect(data.map(d => d.name)).toEqual(['Alice', 'Bob', 'Charlie']);
  });

  it('behandelt gleiche Werte korrekt', () => {
    const data = [{ val: '2' }, { val: '2' }, { val: '1' }];
    DatenSortieren(data, 'val');
    expect(data.map(d => d.val)).toEqual(['1', '2', '2']);
  });

  it('behandelt undefined Werte als leeren String', () => {
    const data: { val?: string }[] = [{ val: '2' }, {}, { val: '1' }];
    DatenSortieren(data, 'val');
    expect(data.map(d => d.val)).toEqual([undefined, '1', '2']);
  });

  it('sortiert numerisch mit gemischten Zahlen', () => {
    const data = [{ val: '100' }, { val: '20' }, { val: '3' }];
    DatenSortieren(data, 'val');
    expect(data.map(d => d.val)).toEqual(['3', '20', '100']);
  });

  it('behandelt Standard-sortBy (0)', () => {
    const data = [{ 0: '2' }, { 0: '1' }];
    DatenSortieren(data);
    expect(data.map(d => d[0])).toEqual(['1', '2']);
  });
});
