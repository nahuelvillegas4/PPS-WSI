import { REQUIREMENTS } from '../../data/requirements';
import type { StopContent } from '../../model/types';
import {
  THEME_TITLE,
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

/** The other gaps, each with its number of open requirements: delivery and process. */
const otherGaps = themes
  .filter((summary) => summary.theme !== 'editor' && summary.theme !== 'pantallas')
  .map((summary) => `${THEME_TITLE[summary.theme].toLowerCase()} (${String(summary.rows.length)})`)
  .join(', ');

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
            text: `Cada cuadrado es uno de los ${REQUIREMENTS.length} requisitos, el desglose que hizo el equipo de los enunciados de las dos PPS: los enunciados no los numeran así. Pendiente incluye lo planificado y lo que no empezó. Una pantalla de gestión que falta cuenta contra la PPS 1, que entrega el flujo en el navegador; la PPS 2 se mide por su módulo, la API. El detalle de cada requisito, con su evidencia en el repositorio, está en el anexo A2.`,
          },
        ],
      },
    ],
    notes: [
      `Falta el editor y las pantallas de gestión: ${String(editorAndScreens)} de los ${String(open)} requisitos abiertos. El resto es entrega y proceso.`,
      `Entrega y proceso: ${otherGaps}.`,
      `Pendiente quiere decir planificado o sin empezar: ${String(pendingCount(counts))} en total (planificados: ${String(counts.planned)}; sin empezar: ${String(counts.notStarted)}).`,
      'Cada requisito, con su evidencia en el repositorio, está en el anexo A2.',
    ],
  },
  diagrams: [],
  tables: [],
};
