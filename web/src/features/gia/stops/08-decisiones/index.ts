import { ADRS, adrQuadrants, type QuadrantCell } from '../../data/adrs';
import { FACTS } from '../../model/facts';
import type { Section, StopContent } from '../../model/types';
import { C1, C1_FOOTNOTE, O1, STATES_LEGEND } from './copy';
import { diagrams } from './diagrams';
import { tables } from './tables';

const quadrants = adrQuadrants(ADRS);

function countIn(
  cells: readonly QuadrantCell[],
  decision: QuadrantCell['decision'],
  realised: QuadrantCell['realised'],
): number {
  return (
    cells.find((cell) => cell.decision === decision && cell.realised === realised)?.items.length ??
    0
  );
}

const section: Section = {
  id: 'decisiones',
  group: 'recorrido',
  title: 'Decisiones',
  headline: `${FACTS.adrs} decisiones de arquitectura, y un cambio de alcance que espera aprobación.`,
  minutes: 2,
  tabs: [
    {
      id: 'adr',
      label: 'Decisiones',
      blocks: [
        { kind: 'callout', tone: 'info', title: 'Qué significan los estados', text: STATES_LEGEND },
        { kind: 'quadrants', cells: quadrants },
        { kind: 'table', id: 'adrs' },
      ],
    },
    {
      id: 'cambio-de-alcance',
      label: 'Cambio de alcance',
      blocks: [
        { kind: 'diagram', id: 'cambio-alcance' },
        { kind: 'table', id: 'tres-ejes' },
        // C1 and O1 stay together: the origin of the request must not get lost.
        {
          kind: 'callout',
          tone: 'honest',
          title: 'Integrado antes de la aprobación escrita',
          text: C1,
        },
        { kind: 'callout', tone: 'info', text: O1 },
        { kind: 'table', id: 'alcance-agregado' },
      ],
    },
  ],
  notes: [
    'Decidido, propuesto y construido son cosas distintas.',
    `Cuadrante: ${countIn(quadrants, 'DECIDIDO', 'realizado')} decisiones tomadas y realizadas, ${countIn(quadrants, 'DECIDIDO', 'parcial')} tomadas con partes pendientes, ${countIn(quadrants, 'PROPUESTO', 'realizado')} propuestas que ya están en el código y ${countIn(quadrants, 'PROPUESTO', 'parcial')} propuestas a medias.`,
    'Cambio de alcance: leer el recuadro en voz alta; el pedido de roles fue del profesor y falta la aprobación escrita de la supervisión.',
    'El código está en main desde el 01/11/2026; el ADR sigue PROPUESTO y la contrapartida de esfuerzo está pendiente.',
  ],
  footnotes: [{ id: 'c1-rama', text: C1_FOOTNOTE }],
};

export const content: StopContent = { section, diagrams, tables };
