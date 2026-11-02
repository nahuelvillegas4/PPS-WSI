import type { StopContent } from '../model/types';
import { riesgosTable } from '../stops/07-calidad/risks';

/**
 * Annex A3. The quality scenarios table (`qs`) is defined once, by stop 7, and only referenced
 * here; the risks table is defined here and lives in `stops/07-calidad/risks.ts` with its data.
 */
export const content: StopContent = {
  section: {
    id: 'a3-calidad',
    group: 'anexo',
    title: 'Calidad y riesgos',
    headline: 'Referencia: escenarios de calidad y riesgos con su estado observable.',
    tabs: [
      {
        id: 'escenarios',
        label: 'Escenarios de calidad',
        blocks: [{ kind: 'table', id: 'qs' }],
      },
      {
        id: 'riesgos',
        label: 'Riesgos',
        blocks: [{ kind: 'table', id: riesgosTable.id }],
      },
    ],
    notes: [
      'Los diez escenarios de calidad y los quince riesgos del plan, con su estado observable hoy.',
      'En los riesgos, el indicador muestra el estado de la mitigación prevista, no la gravedad.',
    ],
  },
  diagrams: [],
  tables: [riesgosTable],
};
