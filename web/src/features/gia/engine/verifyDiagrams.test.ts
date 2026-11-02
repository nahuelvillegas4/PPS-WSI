import { describe, expect, it } from 'vitest';
import { summaryLine, verifyDiagrams } from './verifyDiagrams';

const OK = '<svg viewBox="0 0 100 50"></svg>';

describe('verifyDiagrams', () => {
  it('counts the diagrams that draw and reports every failure with its id and message', async () => {
    const draw = (id: string): Promise<string> => {
      if (id === 'roto') return Promise.reject(new Error('Parse error on line 2'));
      if (id === 'vacio') return Promise.resolve('<svg viewBox="0 0 0 0"></svg>');
      return Promise.resolve(OK);
    };
    const summary = await verifyDiagrams(['tesela', 'roto', 'vacio', 'login'], draw);
    expect(summary.total).toBe(4);
    expect(summary.passed).toBe(2);
    expect(summary.failures.map((failure) => failure.id)).toEqual(['roto', 'vacio']);
    expect(summary.failures[0]?.message).toBe('Parse error on line 2');
    expect(summary.failures[1]?.message).toMatch(/nulo/);
    expect(summaryLine(summary)).toBe('2 de 4 diagramas correctos');
  });

  it('draws one at a time, in order, and reports the progress after each', async () => {
    const log: string[] = [];
    let active = 0;
    const draw = async (id: string): Promise<string> => {
      active += 1;
      expect(active).toBe(1);
      log.push(id);
      await Promise.resolve();
      active -= 1;
      return OK;
    };
    const progress: string[] = [];
    await verifyDiagrams(['a', 'b', 'c'], draw, (done, total) => {
      progress.push(`${String(done)}/${String(total)}`);
    });
    expect(log).toEqual(['a', 'b', 'c']);
    expect(progress).toEqual(['1/3', '2/3', '3/3']);
  });

  it('reports a lost Mermaid chunk without the address of the asset', async () => {
    const lost = new TypeError(
      'Failed to fetch dynamically imported module: http://127.0.0.1:5195/assets/mermaid.core-X.js',
    );
    const summary = await verifyDiagrams(['tesela'], () => Promise.reject(lost));
    const message = summary.failures[0]?.message ?? '';
    expect(message).toMatch(/No se pudo cargar/);
    expect(message).not.toMatch(/https?:|127\.0\.0\.1|5195/);
  });

  it('handles an empty catalogue', async () => {
    const summary = await verifyDiagrams([], () => Promise.resolve(OK));
    expect(summaryLine(summary)).toBe('0 de 0 diagramas correctos');
  });
});
