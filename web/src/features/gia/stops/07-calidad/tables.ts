import { MEASURED } from '../../data/measured';
import { statusOf } from '../../model/diagramKit';
import { FACTS } from '../../model/facts';
import type { TableDef } from '../../model/types';
import { formatDate, formatNumber } from './measuredText';

/** When each suite last ran: the three were not run on the same day or on the same commit. */
const API_RUN = `Corrida del ${formatDate(MEASURED.apiTestCases.asOf)} en contenedor · el código de la API no cambió desde ${MEASURED.apiTestCases.commit}`;
const WEB_RUN = `${formatDate(MEASURED.webTestCases.asOf)} · copia exportada de ${MEASURED.webTestCases.commit}, sin las pruebas de esta guía`;
const TILES_RUN = `Última corrida registrada: ${formatDate(MEASURED.tilesTestFunctions.asOf)} · ${MEASURED.tilesTestFunctions.commit}; el código no cambió desde entonces`;

/** How each automated check ran, what it covers and where it stops. Numbers come from MEASURED. */
export const pruebasTable: TableDef = {
  id: 'pruebas',
  title: 'Pruebas automáticas y verificaciones',
  caption:
    'Cada fila dice cuándo corrió, cuántos casos tiene, qué cubre y dónde termina su alcance. Los números son un registro de ejecución, no una propiedad del código.',
  columns: [
    { key: 'suite', label: 'Suite' },
    { key: 'ran', label: 'Ejecutado' },
    { key: 'cases', label: 'Casos' },
    { key: 'scope', label: 'Alcance' },
    { key: 'limit', label: 'Límite' },
  ],
  rows: [
    {
      suite: 'API (xUnit)',
      ran: API_RUN,
      cases: `${formatNumber(MEASURED.apiTestCases.value)} casos de ${formatNumber(MEASURED.apiTestMethods.value)} métodos`,
      scope:
        'Autorización por proyecto y matriz de operaciones, geometrías, ciclo de vida de las anotaciones, importación CRIC, exportación JSON interno y COCO, almacenamiento',
      limit: 'Sobre SQLite y no sobre PostgreSQL; sin capa HTTP',
    },
    {
      suite: 'Web (Vitest)',
      ran: WEB_RUN,
      cases: `${formatNumber(MEASURED.webTestCases.value)} de ${formatNumber(MEASURED.webTestCases.value)} casos en ${formatNumber(MEASURED.webTestFiles.value)} archivos`,
      scope:
        'Cliente de la API, router, permisos por rol, cola de subida, coordenadas del visor y casos numéricos del contrato',
      limit: 'Solo lógica pura: sin pruebas de componentes ni de navegador',
    },
    {
      suite: 'Teselas (pytest)',
      ran: TILES_RUN,
      cases: `${formatNumber(MEASURED.tilesTestFunctions.value)} de ${formatNumber(MEASURED.tilesTestFunctions.value)} casos`,
      scope: 'Descriptor DZI, teselas, inspección, salud y registro de diapositivas',
      limit: 'Imágenes PNG y JPG sintéticas; ninguna prueba automática abre un SVS real',
    },
    {
      suite: 'Contrato (check_contract.py)',
      ran: 'A mano; no corre en ninguna integración continua',
      cases: '7 bloques (2 se omiten si faltan openslide-python u openapi-spec-validator)',
      scope: `Esquemas, casos numéricos y matriz de autorización de ${FACTS.operations} operaciones frente a la OpenAPI`,
      limit: 'No compara la OpenAPI que genera la API con la del contrato',
    },
    {
      suite: 'Verificaciones asistidas del 01/11',
      ran: '01/11/2026',
      cases:
        '78/78 chequeos contra el sistema levantado y 8/8 pasos en el navegador (estos, con un agente)',
      scope: 'Ingreso real, recorrido en el navegador y ensayo de la migración de ida y vuelta',
      limit: 'Registro local del 01/11, no reproducible desde el repositorio',
    },
  ],
  sources: [
    {
      kind: 'run',
      ref: `run:${MEASURED.webTestCases.asOf} npm test sobre una copia exportada de ${MEASURED.webTestCases.commit}: 284 de 284`,
    },
    {
      kind: 'run',
      ref: `run:${MEASURED.apiTestMethods.asOf} git grep de [Fact] y [Theory] en api/tests sobre ${MEASURED.apiTestMethods.commit}: 152 métodos`,
    },
    {
      kind: 'test',
      ref: 'api/tests/Pps.Domain.Tests/Pps.Domain.Tests.csproj:13',
      note: 'SQLite como base de las pruebas',
    },
    { kind: 'test', ref: 'tiles/tests/conftest.py', note: 'Imágenes sintéticas' },
    { kind: 'code', ref: 'scripts/check_contract.py' },
    { kind: 'doc', ref: 'tiles/README.md', note: '24 pruebas y su comando' },
    { kind: 'manual', ref: 'Registro local del 01/11/2026, no versionado' },
  ],
};

/** Quality scenarios QS-1..QS-10 of the architecture document, with their state today. */
export const qsTable: TableDef = {
  id: 'qs',
  title: 'Escenarios de calidad',
  caption:
    'Medida de aceptación según el documento de arquitectura (v0.9) frente a lo que hay hoy. Ningún escenario figura como cumplido por completo.',
  columns: [
    { key: 'qs', label: 'QS' },
    { key: 'goal', label: 'Objetivo' },
    { key: 'state', label: 'Estado', filterable: true },
    { key: 'evidence', label: 'Evidencia' },
  ],
  rows: [
    {
      qs: 'QS-1',
      goal: 'Corrección: error ≤ 1e-6 px de nivel 0 e ida y vuelta ≤ 0,5 px de pantalla entre zoom 1:64 y 4:1, con ambos adaptadores del visor',
      state: { status: 'partial' },
      evidence:
        'web/src/features/viewer/coordinates.test.ts: los tres casos del contrato con tolerancia 1e-6; no recorre todo el rango de zoom y solo existe el adaptador de OpenSeadragon',
    },
    {
      qs: 'QS-2',
      goal: 'Independencia del zoom: JSON guardado idéntico byte a byte; desplazamiento visual ≤ 1 px de pantalla',
      state: { status: statusOf('editor') },
      evidence: 'Necesita el editor: hoy ninguna prueba puede dibujar una figura',
    },
    {
      qs: 'QS-3',
      goal: 'Autoría: modificar o borrar una anotación ajena da 403 y la anotación original no cambia',
      state: { status: 'partial' },
      evidence:
        'api/tests/Pps.Domain.Tests/AnnotationLifecycleAndConcurrencyTests.cs: el 403 alcanza también al administrador global; corre sobre SQLite y el plan pedía PostgreSQL',
    },
    {
      qs: 'QS-4',
      goal: 'Fluidez: p95 ≤ 150 ms por tesela y apertura en frío ≤ 1 s',
      state: { status: 'partial' },
      evidence: `scripts/bench-tiles.py: p95 ${formatNumber(MEASURED.tileP95Ms.value)} ms y apertura en frío ${formatNumber(MEASURED.tileColdOpenMs.value)} ms el ${formatDate(MEASURED.tileP95Ms.asOf)}, antes de que el acceso dependiera de la membresía; falta volver a medir`,
    },
    {
      qs: 'QS-5',
      goal: 'Instalación: el sistema con datos de prueba en ≤ 30 min siguiendo el README, sin pasos ocultos',
      state: { status: statusOf('smoke') },
      evidence:
        'Sin prueba de humo ni integración continua; no hay registro de un ensayo en una máquina limpia',
    },
    {
      qs: 'QS-6',
      goal: 'Degradación: aviso en ≤ 5 s si cae un servicio; nada se marca guardado sin respuesta 2xx',
      state: { status: 'partial' },
      evidence:
        'web/src/features/viewer/ViewerPage.tsx: el visor avisa las fallas de teselas; el guardado de anotaciones no existe todavía',
    },
    {
      qs: 'QS-7',
      goal: 'Sesión: al vencer la cookie, pantalla de ingreso y regreso a la misma imagen',
      state: { status: 'partial' },
      evidence:
        'web/README.md: al ingresar se vuelve a la ruta pedida; con el visor abierto, la sesión vencida figura como pendiente',
    },
    {
      qs: 'QS-8',
      goal: 'Confidencialidad: 401 en todo salvo ingreso y salud; ninguna ruta entrega las imágenes asociadas',
      state: { status: 'partial' },
      evidence:
        'api/tests/Pps.Domain.Tests/AuthorizationMatrixTests.cs y scripts/check_contract.py verifican la matriz; faltan Content-Security-Policy y TLS',
    },
    {
      qs: 'QS-9',
      goal: 'Extensibilidad: un segundo formato es una clase nueva y no toca los exportadores existentes',
      state: { status: 'partial' },
      evidence:
        'api/src/Pps.Domain/Export/IExporter.cs: dos exportadores (JSON interno y COCO); YOLO no existe y ninguna revisión de cambios lo certifica',
    },
    {
      qs: 'QS-10',
      goal: 'Mantenibilidad: las pruebas de un módulo corren con un comando en ≤ 15 min desde el clon',
      state: { status: 'partial' },
      evidence:
        'web/README.md y tiles/README.md documentan su comando de pruebas; api/README.md no documenta el de la API, la suite más grande; no hay ensayo registrado desde un clon',
    },
  ],
  sources: [
    { kind: 'doc', ref: 'docs/arquitectura/05-calidad-y-riesgos.md:5-16' },
    { kind: 'test', ref: 'web/src/features/viewer/coordinates.test.ts' },
    { kind: 'code', ref: 'scripts/bench-tiles.py' },
    { kind: 'doc', ref: 'docs/BITACORA_PPS2.md', note: 'Día 8: registro de la medición de QS-4' },
  ],
};
