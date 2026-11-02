import { describe, expect, it } from 'vitest';
import { REQUIREMENTS } from '../../data/requirements';
import { PENDING_LABELS, buildHeadline } from './derive';
import { content } from './index';

const { section } = content;
const blocks = section.tabs.flatMap((tab) => tab.blocks);

describe('stop 6: panorama', () => {
  it('has the computed headline, within 90 characters, and one tab', () => {
    expect(section.id).toBe('requisitos');
    expect(section.headline).toBe(buildHeadline(REQUIREMENTS));
    expect(section.headline.length).toBeLessThanOrEqual(90);
    expect(section.tabs.map((tab) => tab.id)).toEqual(['panorama']);
  });

  it('names the pending requirements "pendiente" in the waffle and in the bars', () => {
    const waffle = blocks.find((block) => block.kind === 'waffle');
    const bars = blocks.find((block) => block.kind === 'bars');
    expect(waffle?.kind === 'waffle' ? waffle.statusLabels : undefined).toBe(PENDING_LABELS);
    expect(bars?.kind === 'bars' ? bars.statusLabels : undefined).toBe(PENDING_LABELS);
  });

  it('says the gap is the editor and the management screens, with the counts of the rows', () => {
    // Editor 15 and management screens 6 of the 42 open requirements (partial 39, pending 3).
    expect(section.notes[0]).toBe(
      'Falta el editor y las pantallas de gestión: 21 de los 42 requisitos abiertos. El resto es entrega y proceso.',
    );
    const text = section.notes.join(' ');
    expect(text).not.toMatch(/una sola/);
    expect(section.notes[1]).toContain('servidor del laboratorio (4)');
    expect(section.notes[1]).toContain('datos de prueba (5)');
    expect(section.notes[2]).toContain('planificados: 1; sin empezar: 2');
  });

  it('explains how to read the squares: team breakdown, pending, and the rule of the screens', () => {
    const callout = blocks.find((block) => block.kind === 'callout');
    const text = callout?.kind === 'callout' ? callout.text : '';
    expect(text).toContain(`Cada cuadrado es uno de los ${String(REQUIREMENTS.length)} requisitos`);
    expect(text).toContain('los enunciados no los numeran así');
    expect(text).toContain('Pendiente incluye lo planificado y lo que no empezó');
    expect(text).toContain('cuenta contra la PPS 1');
  });
});
