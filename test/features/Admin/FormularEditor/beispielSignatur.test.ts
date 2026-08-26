import { afterEach, describe, expect, it, spyOn } from 'bun:test';
import { beispielSignatur } from '@/features/Admin/components/FormularEditor/beispielSignatur';

let getContextSpy: ReturnType<typeof spyOn> | undefined;
let toDataURLSpy: ReturnType<typeof spyOn> | undefined;

describe('beispielSignatur', () => {
  afterEach(() => {
    getContextSpy?.mockRestore();
    toDataURLSpy?.mockRestore();
    getContextSpy = undefined;
    toDataURLSpy = undefined;
  });

  it('liefert undefined, wenn kein 2D-Kontext verfügbar ist (happy-dom)', () => {
    expect(beispielSignatur()).toBeUndefined();
  });

  it('zeichnet die Beispielunterschrift und liefert eine Data-URL', () => {
    const calls: string[] = [];
    const fakeCtx = {
      strokeStyle: '',
      lineWidth: 0,
      lineCap: '',
      lineJoin: '',
      beginPath: () => calls.push('beginPath'),
      moveTo: () => calls.push('moveTo'),
      bezierCurveTo: () => calls.push('bezierCurveTo'),
      quadraticCurveTo: () => calls.push('quadraticCurveTo'),
      stroke: () => calls.push('stroke'),
    };
    getContextSpy = spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      fakeCtx as unknown as RenderingContext,
    );
    toDataURLSpy = spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,FAKE');

    const result = beispielSignatur(200, 70);

    expect(result).toBe('data:image/png;base64,FAKE');
    expect(fakeCtx.strokeStyle).toBe('#1b1b3a');
    expect(fakeCtx.lineWidth).toBe(Math.max(2, 70 / 28));
    expect(fakeCtx.lineCap).toBe('round');
    expect(fakeCtx.lineJoin).toBe('round');
    expect(calls.filter(c => c === 'beginPath').length).toBe(2);
    expect(calls.filter(c => c === 'stroke').length).toBe(2);
    expect(calls).toContain('bezierCurveTo');
    expect(calls).toContain('quadraticCurveTo');
  });

  it('nutzt die Default-Größe 400x140, wenn keine Argumente übergeben werden', () => {
    const fakeCtx = {
      strokeStyle: '',
      lineWidth: 0,
      lineCap: '',
      lineJoin: '',
      beginPath: () => {},
      moveTo: () => {},
      bezierCurveTo: () => {},
      quadraticCurveTo: () => {},
      stroke: () => {},
    };
    let canvasSize: { width: number; height: number } | undefined;
    getContextSpy = spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
      this: HTMLCanvasElement,
    ) {
      canvasSize = { width: this.width, height: this.height };
      return fakeCtx;
    } as unknown as typeof HTMLCanvasElement.prototype.getContext);
    toDataURLSpy = spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,FAKE');

    beispielSignatur();

    expect(canvasSize).toEqual({ width: 400, height: 140 });
  });
});
