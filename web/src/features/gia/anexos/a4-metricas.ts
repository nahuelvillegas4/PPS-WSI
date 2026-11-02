import { MEASURED } from '../data/measured';
import { FACTS } from '../model/facts';
import type { Measured } from '../model/status';
import type { Cell, StopContent, TableDef } from '../model/types';
import { describeMeasured, formatNumber } from '../stops/07-calidad/measuredText';

/** The pinned numbers are checked against the repository by a test, which the cell says. */
const PINNED = 'Cada cifra de este grupo se compara con el repositorio en una prueba.';

function systemRow(concept: string, value: number, how: string): Record<string, Cell> {
  return { concept, value: formatNumber(value), how: `${how} ${PINNED}` };
}

function measuredRow(concept: string, value: string, measured: Measured): Record<string, Cell> {
  return { concept, value, how: describeMeasured(measured) };
}

function sizeRow(concept: string, files: Measured, lines: Measured): Record<string, Cell> {
  const value = `${formatNumber(files.value)} archivos · ${formatNumber(lines.value)} líneas`;
  return measuredRow(concept, value, lines);
}

/** Measured numbers of the system. No figure per person and no hours: see `data/measured.ts`. */
export const metricasTable: TableDef = {
  id: 'metricas',
  title: 'Números medidos',
  caption:
    'Cada fila dice cómo se midió, cuándo y sobre qué commit. Son un registro de una fecha: a medida que el proyecto avanza, dejan de coincidir con el repositorio.',
  columns: [
    { key: 'concept', label: 'Concepto' },
    { key: 'value', label: 'Valor', align: 'right' },
    { key: 'how', label: 'Cómo se midió' },
  ],
  rows: [
    // Numbers of the system, pinned by tests -------------------------------------------------
    systemRow(
      'Operaciones de la API',
      FACTS.operations,
      'Operaciones (operationId) de contract/openapi/api.v1.yaml; igual a las filas de la matriz de autorización.',
    ),
    systemRow(
      'Operaciones del servicio de teselas',
      FACTS.tileOperations,
      'Operaciones (operationId) de contract/openapi/tiles.v1.yaml.',
    ),
    systemRow('Controladores de la API', FACTS.controllers, 'Archivos *Controller.cs de api/src.'),
    systemRow('Tablas', FACTS.tables, 'Tablas declaradas en el contexto de datos (ToTable).'),
    systemRow('Migraciones', FACTS.migrations, 'Archivos de migración, sin los .Designer.cs.'),
    systemRow(
      'Pantallas del producto',
      FACTS.screens,
      'Ingreso, catálogo, visor, usuarios y miembros; esta guía no se cuenta.',
    ),
    systemRow(
      'Decisiones de arquitectura (ADR)',
      FACTS.adrs,
      'ADR numerados de docs/adr, sin el índice ni la plantilla.',
    ),
    systemRow(
      'Requisitos de las dos PPS',
      FACTS.requirements,
      'Filas de la tabla de requisitos del anexo A2 (PPS 1 y PPS 2).',
    ),

    // Measured on the snapshot commit ----------------------------------------------------------
    measuredRow('Commits', formatNumber(MEASURED.commits.value), MEASURED.commits),
    measuredRow(
      'Archivos versionados',
      formatNumber(MEASURED.trackedFiles.value),
      MEASURED.trackedFiles,
    ),
    sizeRow('API: código fuente', MEASURED.apiSourceFiles, MEASURED.apiSourceLines),
    sizeRow('API: pruebas', MEASURED.apiTestFiles, MEASURED.apiTestLines),
    sizeRow('Web: código', MEASURED.webSourceFiles, MEASURED.webSourceLines),
    sizeRow('Web: estilos', MEASURED.webStyleFiles, MEASURED.webStyleLines),
    sizeRow('Web: pruebas', MEASURED.webTestFiles, MEASURED.webTestLines),
    sizeRow('Teselas: código', MEASURED.tilesAppFiles, MEASURED.tilesAppLines),
    sizeRow('Teselas: pruebas', MEASURED.tilesTestFiles, MEASURED.tilesTestLines),
    sizeRow('Scripts', MEASURED.scriptFiles, MEASURED.scriptLines),
    sizeRow('Documentación en Markdown', MEASURED.docFiles, MEASURED.docLines),
    measuredRow(
      'Total de código, estilos y pruebas',
      `${formatNumber(MEASURED.totalLines.value)} líneas`,
      MEASURED.totalLines,
    ),

    // Automated tests: declarations and executions ---------------------------------------------
    measuredRow(
      'Pruebas de la API: métodos declarados',
      formatNumber(MEASURED.apiTestMethods.value),
      MEASURED.apiTestMethods,
    ),
    measuredRow(
      'Pruebas de la API: casos ejecutados',
      formatNumber(MEASURED.apiTestCases.value),
      MEASURED.apiTestCases,
    ),
    measuredRow(
      'Pruebas de la web: casos ejecutados',
      formatNumber(MEASURED.webTestCases.value),
      MEASURED.webTestCases,
    ),
    measuredRow(
      'Pruebas de teselas: casos',
      formatNumber(MEASURED.tilesTestFunctions.value),
      MEASURED.tilesTestFunctions,
    ),

    // Performance, measured before the membership check -----------------------------------------
    measuredRow(
      'Teselas: apertura en frío del descriptor',
      `${formatNumber(MEASURED.tileColdOpenMs.value)} ms`,
      MEASURED.tileColdOpenMs,
    ),
    measuredRow(
      'Teselas: p95 de una tesela',
      `${formatNumber(MEASURED.tileP95Ms.value)} ms`,
      MEASURED.tileP95Ms,
    ),
  ],
  sources: [
    {
      kind: 'run',
      ref: `run:${MEASURED.commits.asOf} conteos con git y wc sobre una exportación del commit ${MEASURED.commits.commit}`,
    },
    {
      kind: 'doc',
      ref: 'docs/BITACORA_PPS2.md',
      note: 'Día 8: registro de la medición de teselas',
    },
    { kind: 'code', ref: 'scripts/bench-tiles.py' },
  ],
};

export const content: StopContent = {
  section: {
    id: 'a4-metricas',
    group: 'anexo',
    title: 'Métricas medidas',
    headline: 'Referencia: números medidos, con fecha, método y límites.',
    tabs: [
      {
        id: 'metricas',
        label: 'Métricas',
        blocks: [
          {
            kind: 'callout',
            tone: 'honest',
            title: 'Un número, una fecha',
            text: 'Estos valores se contaron en una fecha y sobre un commit; no se actualizan solos. Las líneas de código se cuentan sobre archivos versionados, así que no incluyen dependencias ni salidas de compilación.',
          },
          { kind: 'table', id: metricasTable.id },
        ],
      },
    ],
    notes: [
      'Cada fila lleva la fecha, el commit y el método con que se midió.',
      'A propósito no hay cifras por persona ni horas dedicadas; si la supervisión las pide, se conversan aparte.',
    ],
  },
  diagrams: [],
  tables: [metricasTable],
};
