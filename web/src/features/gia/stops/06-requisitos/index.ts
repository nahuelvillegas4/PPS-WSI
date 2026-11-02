import { REQUIREMENTS } from '../../data/requirements';
import type { StopContent } from '../../model/types';
import {
  buildBars,
  buildGapCards,
  buildHeadline,
  buildWaffle,
  pendingCount,
  stateCounts,
  summarizeThemes,
} from './derive';

const counts = stateCounts(REQUIREMENTS);
const open = counts.partial + pendingCount(counts);
const themes = summarizeThemes(REQUIREMENTS);

/** Open requirements of the editor and the management screens: the dominant gap. */
const editorAndScreens = themes
  .filter((summary) => summary.theme === 'editor' || summary.theme === 'pantallas')
  .reduce((sum, summary) => sum + summary.rows.length, 0);

export const content: StopContent = {
  section: {
    id: 'requisitos',
    group: 'recorrido',
    title: 'Requisitos',
    headline: buildHeadline(REQUIREMENTS),
    minutes: 2,
    tabs: [
      {
        id: 'panorama',
        label: 'Panorama',
        blocks: [
          buildWaffle(REQUIREMENTS),
          buildBars(REQUIREMENTS),
          buildGapCards(REQUIREMENTS),
          {
            kind: 'callout',
            tone: 'info',
            title: 'Cómo leer este panorama',
            text: `Cada cuadrado es uno de los ${REQUIREMENTS.length} requisitos de los enunciados de las dos PPS. Pendiente incluye lo planificado y lo que no empezó. El detalle de cada requisito, con su evidencia en el repositorio, está en el anexo A2.`,
          },
        ],
      },
    ],
    notes: [
      'La brecha es una sola: el editor y tres pantallas.',
      `El editor y las pantallas concentran ${editorAndScreens} de los ${open} requisitos abiertos; el resto son temas de entrega y de proceso.`,
      `Pendiente quiere decir planificado o sin empezar: ${pendingCount(counts)} en total.`,
      'Cada requisito, con su evidencia en el repositorio, está en el anexo A2.',
    ],
  },
  diagrams: [],
  tables: [],
};
