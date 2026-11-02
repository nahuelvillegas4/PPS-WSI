import { describe, expect, it } from 'vitest';
import { allRepoPaths, readRepoFile } from '../../drift/repoFiles.testing';
import { FEATURES } from '../../model/features';
import { CLAIM_PATTERNS, LEAK_PATTERNS, matchesOf } from '../10-final/unitChecks.testing';
import { content } from './index';
import { QUESTIONS } from './questions';

/** The wording agreed for the five questions, copied here so an edit of the data is noticed. */
const AGREED_TEXT = [
  'Aprobación escrita del cambio de alcance (roles por proyecto y subida desde el navegador: ADR-15, 16 y 17) y qué alcance se retira como contrapartida de esfuerzo. Bloquea: contrato 1.0.0 y actualización de la documentación.',
  'Reparto del editor (ADR-08, S1): ¿lo construye la PPS 1 (opción A propuesta) o la PPS 2 (opción B)? Ambas PPS lo listan. Bloquea: el editor.',
  'Servidor del laboratorio o VM (S2): fecha de acceso, sistema, recursos, ubicación de las imágenes, o aceptar una VM. Bloquea: despliegue y aceptación.',
  'Acceso externo y TLS (S3): solo red del laboratorio o también desde afuera; certificado propio o proxy del laboratorio. Bloquea: configuración de cookies y pasarela.',
  'Datos de aceptación (S4, S6): qué subconjunto de CRIC o CCEDD y qué WSI de prueba, con qué licencia. Bloquea: la demostración.',
];

function cards() {
  const blocks = content.section.tabs.flatMap((tab) => tab.blocks);
  const found = blocks.flatMap((block) => (block.kind === 'cards' ? [block] : []));
  return found;
}

describe('stop 11 (preguntas)', () => {
  const { section } = content;

  it('is the closing stop of the walk-through, one minute long, with the agreed headline', () => {
    expect(section.id).toBe('preguntas');
    expect(section.group).toBe('recorrido');
    expect(section.minutes).toBe(1);
    expect(section.headline).toBe('Cinco decisiones que necesitamos de la supervisión.');
    expect(section.headline.length).toBeLessThanOrEqual(90);
  });

  it('has 2 to 4 speaker notes and opens with the sentence to say aloud', () => {
    expect(section.notes.length).toBeGreaterThanOrEqual(2);
    expect(section.notes.length).toBeLessThanOrEqual(4);
    expect(section.notes[0]).toBe('Esto es lo que necesitamos de ustedes.');
  });

  it('has exactly five numbered question cards, in one block', () => {
    const found = cards();
    expect(found).toHaveLength(1);
    const items = found[0]?.items ?? [];
    expect(items).toHaveLength(5);
    expect(items.map((item) => item.title)).toEqual([
      'Pregunta 1',
      'Pregunta 2',
      'Pregunta 3',
      'Pregunta 4',
      'Pregunta 5',
    ]);
    expect(QUESTIONS.map((question) => question.n)).toEqual([1, 2, 3, 4, 5]);
  });

  it('shows the agreed wording of each question verbatim', () => {
    const items = cards()[0]?.items ?? [];
    expect(items.map((item) => item.body)).toEqual(AGREED_TEXT);
  });

  it('says in every question what it blocks', () => {
    for (const item of cards()[0]?.items ?? []) expect(item.body).toContain('Bloquea:');
  });

  it('marks every question as waiting for a decision, the one about TLS following its tripwire', () => {
    const items = cards()[0]?.items ?? [];
    expect(items.every((item) => item.status === 'unknown')).toBe(true);
    expect(items[3]?.status).toBe(FEATURES.tls.status);
  });

  it('defines no diagram and no table', () => {
    expect(content.diagrams).toHaveLength(0);
    expect(content.tables).toHaveLength(0);
  });

  it('never claims approval, acceptance or protection, and leaks no secret or port', () => {
    expect(matchesOf(section, CLAIM_PATTERNS)).toEqual([]);
    expect(matchesOf(section, LEAK_PATTERNS)).toEqual([]);
  });
});

describe('the codes the questions cite still exist in the documents', () => {
  it('finds each ADR, pending item, question of the guide and risk in its document', async () => {
    const pending = await readRepoFile('docs/arquitectura/07-pendientes.md');
    const risks = await readRepoFile('docs/arquitectura/05-calidad-y-riesgos.md');
    const adrFiles = allRepoPaths().filter((path) => /^docs\/adr\/\d{4}-.+\.md$/.test(path));

    for (const question of QUESTIONS) {
      expect(question.refs.length).toBeGreaterThan(0);
      for (const ref of question.refs) {
        const adr = /^ADR-(\d+)$/.exec(ref);
        if (adr?.[1] !== undefined) {
          const prefix = `docs/adr/${adr[1].padStart(4, '0')}-`;
          expect(
            adrFiles.some((path) => path.startsWith(prefix)),
            ref,
          ).toBe(true);
        } else if (/^S\d+$/.test(ref)) {
          expect(pending, ref).toMatch(new RegExp(`^\\| ${ref} \\|`, 'm'));
        } else if (/^P\d+$/.test(ref)) {
          expect(pending, ref).toMatch(new RegExp(`\\b${ref}\\b`));
        } else if (/^R\d+$/.test(ref)) {
          expect(risks, ref).toMatch(new RegExp(`^\\| ${ref} \\|`, 'm'));
        } else {
          expect.unreachable(`Unknown kind of reference: ${ref}`);
        }
      }
    }
  });

  it('cites in the card chips every pending item named in its question', () => {
    for (const question of QUESTIONS) {
      const named = [...question.text.matchAll(/\bS\d+\b/g)].map((match) => match[0]);
      for (const code of named) expect(question.refs).toContain(code);
    }
  });
});
