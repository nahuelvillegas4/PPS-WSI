import { MEASURED } from '../../data/measured';
import { FACTS } from '../../model/facts';
import { FEATURES } from '../../model/features';
import type { Block, StopContent } from '../../model/types';
import { contratoVerificacion } from './diagrams';
import { executionRecord, formatNumber } from './measuredText';
import { pruebasTable, qsTable } from './tables';

/** Stats of the three suites. The API figure always says it counts executions of N methods. */
const suiteStats: Block = {
  kind: 'stats',
  items: [
    {
      value: formatNumber(MEASURED.apiTestCases.value),
      label: `casos de la API, de ${formatNumber(MEASURED.apiTestMethods.value)} métodos, sobre SQLite`,
    },
    {
      value: formatNumber(MEASURED.webTestCases.value),
      label: `casos de la web, en ${formatNumber(MEASURED.webTestFiles.value)} archivos`,
    },
    {
      value: formatNumber(MEASURED.tilesTestFunctions.value),
      label: 'casos de teselas (pytest)',
    },
  ],
};

/** What the tests do not reach. Gaps that a tripwire guards reuse the sentence of `FEATURES`. */
const notCovered: Block = {
  kind: 'cards',
  items: [
    { title: 'Sin capa HTTP', body: FEATURES.httpTests.gap, chips: ['API'] },
    {
      title: 'Sin PostgreSQL real',
      body: 'La suite de la API usa SQLite en lugar de PostgreSQL; la migración y su reversa se ensayaron aparte, en una base descartable (registro local, no versionado).',
      chips: ['API'],
    },
    {
      title: 'Sin pruebas de interfaz',
      body: 'Las pruebas de la web cubren lógica pura (cliente de la API, router, permisos, cola de subida, coordenadas); no hay pruebas de componentes ni de navegador.',
      chips: ['Web'],
    },
    {
      title: 'Sin un SVS real',
      body: 'Las pruebas de teselas usan imágenes PNG y JPG sintéticas; los SVS reales solo se usaron en el script de medición y en las verificaciones asistidas del 01/11.',
      chips: ['Teselas'],
    },
    { title: 'Sin integración continua', body: FEATURES.ci.gap, chips: ['Todas'] },
  ],
};

export const content: StopContent = {
  section: {
    id: 'calidad',
    group: 'recorrido',
    title: 'Calidad',
    headline: 'Qué se probó, cómo y qué no cubren las pruebas.',
    minutes: 1.5,
    tabs: [
      {
        id: 'pruebas',
        label: 'Pruebas',
        blocks: [
          suiteStats,
          {
            kind: 'callout',
            tone: 'honest',
            title: 'Cómo leer estos números',
            text: executionRecord(),
          },
          notCovered,
          { kind: 'table', id: pruebasTable.id },
        ],
      },
      {
        id: 'contrato',
        label: 'Contrato',
        blocks: [{ kind: 'diagram', id: contratoVerificacion.id }],
      },
      {
        id: 'escenarios',
        label: 'Escenarios de calidad',
        blocks: [{ kind: 'table', id: qsTable.id }],
      },
    ],
    notes: [
      'Cada número lleva fecha, método y límites.',
      `${formatNumber(MEASURED.apiTestCases.value)} es la cantidad de casos ejecutados; los ${formatNumber(MEASURED.apiTestMethods.value)} métodos son las declaraciones, porque un método con datos corre varias veces.`,
      'Las pruebas de la API usan SQLite y no atraviesan HTTP: lo propio de PostgreSQL se ensayó aparte, sin registro en el repositorio.',
      `La matriz de ${FACTS.operations} operaciones del contrato es la fuente única de tres verificadores.`,
    ],
  },
  diagrams: [contratoVerificacion],
  tables: [pruebasTable, qsTable],
};
