import { describe, expect, it } from 'vitest';
import {
  blockRefs,
  forbiddenInContent,
  forbiddenInSource,
  longLines,
  missingEvidence,
  participantCount,
} from '../02-arquitectura/contentChecks.testing';
import { content } from './index';

const { section, diagrams, tables } = content;
const sequences = diagrams.filter((diagram) => diagram.kind === 'sequence');

describe('stop 3: section', () => {
  it('has a short headline, 2 to 4 notes whose first line is the talking point, and minutes', () => {
    expect(section.id).toBe('flujos');
    expect(section.headline.length).toBeLessThanOrEqual(90);
    expect(section.notes.length).toBeGreaterThanOrEqual(2);
    expect(section.notes.length).toBeLessThanOrEqual(4);
    expect(section.notes[0]).toBe('Cada tesela le pide permiso a la API antes de servirse.');
    expect(section.minutes).toBe(3.5);
  });

  it('offers the five flows as tabs, starting with viewing an image', () => {
    expect(section.tabs.map((tab) => tab.label)).toEqual([
      'Ver una imagen',
      'Ingreso',
      'Subir',
      'Anotar',
      'Importar y exportar',
    ]);
  });

  it('shows one diagram per flow tab and keeps the session states as detail', () => {
    const byTab = Object.fromEntries(
      section.tabs.map((tab) => [
        tab.id,
        tab.blocks.flatMap((block) => (block.kind === 'diagram' ? [block.id] : [])),
      ]),
    );
    expect(byTab).toEqual({
      'ver-imagen': ['tesela'],
      ingreso: ['login'],
      subir: ['subida'],
      anotar: ['anotar'],
      'importar-exportar': ['import-export'],
    });
    expect(section.detail).toEqual([{ kind: 'diagram', id: 'sesion-spa' }]);
    expect(blockRefs(section).diagrams.slice().sort()).toEqual(
      diagrams.map((diagram) => diagram.id).sort(),
    );
    expect(tables).toEqual([]);
  });

  it('puts the live tile-mode badge and the development-variant box next to the tile diagram', () => {
    const tab = section.tabs.find((item) => item.id === 'ver-imagen');
    expect(tab?.blocks).toEqual([
      { kind: 'diagram', id: 'tesela' },
      { kind: 'live', id: 'tile-mode' },
      {
        kind: 'callout',
        tone: 'warning',
        title: 'Variante de desarrollo (compose.dev-sin-login.yaml)',
        text: 'Reemplaza la consulta de acceso por una clave fija: toda imagen, exista o no, apunta al mismo archivo. Solo para desarrollo; no es el sistema que describe el diagrama.',
      },
    ]);
  });

  it('says what is missing instead of presenting it as done', () => {
    const calloutText = (tabId: string): string =>
      section.tabs
        .find((tab) => tab.id === tabId)
        ?.blocks.flatMap((block) => (block.kind === 'callout' ? [block.text] : []))
        .join(' ') ?? '';
    expect(calloutText('anotar')).toContain('no se puede anotar desde el navegador');
    expect(calloutText('subir')).toContain('PROPUESTO');
    expect(calloutText('importar-exportar')).toContain('no existen');
  });

  it('contains no secret, internal name, port or overpromising word', () => {
    expect(forbiddenInContent(section)).toEqual([]);
  });
});

describe('stop 3: diagrams', () => {
  it('provides the six diagrams of the catalogue with their priorities', () => {
    expect(Object.fromEntries(diagrams.map((diagram) => [diagram.id, diagram.priority]))).toEqual({
      login: 'P0',
      tesela: 'P0',
      subida: 'P1',
      anotar: 'P0',
      'import-export': 'P1',
      'sesion-spa': 'P2',
    });
  });

  it.each(diagrams.map((diagram) => [diagram.id, diagram] as const))(
    '%s explains itself and respects the shape rules',
    (_id, diagram) => {
      expect(diagram.title).not.toBe('');
      expect(diagram.summary.length).toBeGreaterThan(80);
      expect(diagram.sources.length).toBeGreaterThan(0);
      expect(forbiddenInSource(diagram.source)).toEqual([]);
      expect(longLines(diagram)).toEqual([]);
      expect(missingEvidence(diagram.sources)).toEqual([]);
      expect(forbiddenInContent(diagram)).toEqual([]);
      // No status classes: partial and planned parts are marked with a Note that starts with a glyph.
      expect(diagram.usesStatus).toBe(false);
      expect(diagram.source).not.toContain(':::');
    },
  );

  it.each(sequences.map((diagram) => [diagram.id, diagram] as const))(
    '%s is a sequence diagram with at most 6 participants',
    (_id, diagram) => {
      expect(diagram.source.startsWith('sequenceDiagram')).toBe(true);
      expect(participantCount(diagram.source)).toBeLessThanOrEqual(6);
    },
  );

  it.each(sequences.map((diagram) => [diagram.id, diagram] as const))(
    '%s has no semicolon in its text, which Mermaid reads as the end of a statement',
    (_id, diagram) => {
      expect(diagram.source.split('\n').filter((line) => line.includes(';'))).toEqual([]);
    },
  );

  it('marks every partial or planned part with its glyph and its word', () => {
    const source = (id: string) => diagrams.find((diagram) => diagram.id === id)?.source ?? '';
    expect(source('login')).toContain('◐ PARCIAL');
    expect(source('subida')).toContain('○ PLANIFICADO');
    expect(source('anotar')).toContain('○ PENDIENTE');
    expect(source('import-export')).toContain('○ PLANIFICADA');
    expect(source('import-export')).toContain('○ yolo');
    expect(source('sesion-spa')).toContain('○ vencimiento');
  });

  it('uses the right diagram kind for each flow', () => {
    expect(diagrams.find((diagram) => diagram.id === 'sesion-spa')?.kind).toBe('state');
    expect(
      diagrams.find((diagram) => diagram.id === 'sesion-spa')?.source.startsWith('stateDiagram-v2'),
    ).toBe(true);
  });
});
