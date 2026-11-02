/**
 * Diagrams of the stop "Estado final": the screen map (G19, `mapa-pantallas`), the acceptance
 * steps (G20, `aceptacion`) and the proposed final deployment (G21, `estado-final`).
 *
 * Statuses come from `g()` / `c()`: planned items read `FEATURES`, so a tripwire changes the
 * mark here without anyone retyping it. No source writes `classDef` or a colour.
 */
import { c, g, type StatusRef } from '../../model/diagramKit';
import { STATUS_META } from '../../model/status';
import type { DiagramDef } from '../../model/types';
import { ACCEPTANCE } from './acceptance';
import { BUILT_SCREENS, PROPOSED_SCREENS, type ScreenNode } from './screens';

/** C3: the title of the final-state diagram, as agreed for the presentation. */
export const FINAL_STATE_TITLE =
  'Estado final propuesto (v0.9, 28/09/2026), no confirmado por la supervisión';

/** One node: `ID["<glyph> line<br/>line"]:::class`, glyph and class from the same status. */
function node(
  id: string,
  ref: StatusRef,
  lines: readonly string[],
  shape: 'box' | 'cylinder' = 'box',
): string {
  const label = `"${g(ref)} ${lines.join('<br/>')}"`;
  return shape === 'cylinder' ? `${id}[(${label})]${c(ref)}` : `${id}[${label}]${c(ref)}`;
}

/** A flowchart source: the header, then every line indented two spaces (more when nested). */
function flowchart(direction: 'LR' | 'TB', lines: readonly string[]): string {
  return [`flowchart ${direction}`, ...lines.map((line) => `  ${line}`)].join('\n');
}

function screenNode(screen: ScreenNode): string {
  return node(screen.id, screen.ref, screen.lines);
}

const SCREEN_MAP: DiagramDef = {
  id: 'mapa-pantallas',
  kind: 'flowchart',
  title: 'Pantallas',
  summary: `Mapa de las pantallas de la interfaz: ${BUILT_SCREENS.length} existen (ingreso, catálogo, visor, usuarios, miembros y esta guía) y ${PROPOSED_SCREENS.length} son propuestas sin diseño (editor, clases, importación y exportación).`,
  caption:
    'Lo punteado son propuestas: no existe ninguna especificación de interfaz en el repositorio.',
  source: flowchart('LR', [
    ...BUILT_SCREENS.map(screenNode),
    ...PROPOSED_SCREENS.map(screenNode),
    'LOGIN --> CAT',
    'CAT --> VIEW',
    'CAT --> MEMB',
    'CAT --> USERS',
    'VIEW -.-> EDIT',
    'CAT -.-> CLS',
    'CAT -.-> IMP',
    'CAT -.-> EXP',
  ]),
  usesStatus: true,
  sources: [
    {
      kind: 'code',
      ref: 'web/src/shared/router.ts',
      note: 'Route y parseRoute: las rutas que existen',
    },
    {
      kind: 'code',
      ref: 'web/src/app/App.tsx',
      note: 'Un caso por ruta; los botones que llevan a cada pantalla',
    },
    {
      kind: 'doc',
      ref: 'docs/arquitectura/03-bloques-y-ejecucion.md:60-83',
      note: 'Vista de la SPA: annotations e io figuran en el diseño, no en el código',
    },
    {
      kind: 'doc',
      ref: 'docs/arquitectura/06-organizacion-y-roadmap.md:112-117',
      note: 'Incrementos en que se prevé el editor y las pantallas de gestión',
    },
  ],
  priority: 'P1',
};

const ACCEPTANCE_STEPS: DiagramDef = {
  id: 'aceptacion',
  kind: 'flowchart',
  title: 'Criterios de aceptación',
  summary:
    'Los cinco pasos de la demostración que piden los enunciados de las dos PPS, en orden: importar, anotar, verificar, exportar y levantar todo con la documentación en el servidor. Cada paso lleva la marca de lo que se puede demostrar hoy.',
  caption: 'Orden de la demostración según los enunciados (PPS 1 §8 y PPS 2 §7).',
  source: flowchart('LR', [
    ...ACCEPTANCE.map((step, index) => node(`A${index + 1}`, step.status, step.lines)),
    ...ACCEPTANCE.slice(1).map((_, index) => `A${index + 1} --> A${index + 2}`),
  ]),
  usesStatus: true,
  sources: [
    {
      kind: 'doc',
      ref: 'docs/PPS_01_Plataforma_Anotacion_Imagenes_Medicas.pdf',
      note: 'Sección de aceptación (PPS 1)',
    },
    {
      kind: 'doc',
      ref: 'docs/PPS_02_Gestion_Anotacion_Datasets (1).pdf',
      note: 'Sección de aceptación (PPS 2)',
    },
    {
      kind: 'doc',
      ref: 'docs/arquitectura/06-organizacion-y-roadmap.md:149-158',
      note: 'Criterios, épicas y momento en que cada uno queda demostrable',
    },
    {
      kind: 'test',
      ref: 'scripts/test_acceptance_i3.py',
      note: 'Hoy el ensayo corre solo por HTTP',
    },
  ],
  priority: 'P1',
};

/**
 * The server is a subgraph marked "sin decidir": the lab server, the way in from outside and TLS
 * have no answer yet (S2, S3), so nothing here names an operating system, a host or an address.
 */
const FINAL_STATE: DiagramDef = {
  id: 'estado-final',
  kind: 'flowchart',
  title: FINAL_STATE_TITLE,
  summary:
    'Despliegue final propuesto: el navegador llega, por un acceso externo todavía sin decidir (TLS o proxy del laboratorio), a un servidor del laboratorio o una máquina virtual equivalente (pendientes S2 y P18, riesgo R13). Ahí corren la pasarela, la API, las teselas y la base de datos, con las imágenes y los volúmenes. Una franja de operación planificada suma respaldo, prueba de humo, descarga de muestras, reinicio y límite de logs, e integración continua.',
  caption:
    'El servidor (S2, P18, riesgo R13) y el acceso externo con TLS (S3, P19) no tienen respuesta registrada en el repositorio; lo punteado no existe en él.',
  source: flowchart('TB', [
    'NAV["Navegador"]',
    node('TLS', 'tls', ['TLS o proxy del laboratorio', '(S3, P19)']),
    `subgraph SRV["${g('unknown')} Servidor del laboratorio o VM (S2)"]`,
    '  ' + node('GW', 'done', ['Pasarela', 'SPA y puerta única']),
    '  ' + node('API', 'done', ['API']),
    '  ' + node('TIL', 'done', ['Teselas']),
    '  ' + node('DB', 'done', ['Base de datos'], 'cylinder'),
    '  ' + node('IMG', 'done', ['Imágenes', 'la API escribe, las teselas leen'], 'cylinder'),
    '  ' + node('VOL', 'done', ['Volúmenes', 'datos y claves de sesión'], 'cylinder'),
    'end',
    'subgraph OPS["Operación (planificada)"]',
    '  ' + node('BK', 'backup', ['Respaldo y restauración', 'de la base de datos']),
    '  ' + node('SM', 'smoke', ['Prueba de humo', 'del despliegue']),
    '  ' + node('FS', 'fetchSamples', ['Descarga de imágenes', 'de muestra']),
    '  ' + node('RS', 'composeServer', ['Reinicio automático', 'y límite de logs']),
    '  ' + node('CI', 'ci', ['Integración continua', '(S14, sin respuesta registrada)']),
    'end',
    node('NOTE', 'planned', [
      'Puertos de la API y de la base',
      'limitados al propio servidor',
      '(propuesto en el ADR-16)',
    ]),
    'NAV -.-> TLS',
    'TLS -.-> GW',
    'GW --> API',
    'GW --> TIL',
    'API --> DB',
    'API ---|"lee y escribe"| IMG',
    'TIL ---|"solo lee"| IMG',
    'DB --- VOL',
    'API --- VOL',
    'BK -.-> DB',
    'SM -.-> GW',
    'FS -.-> IMG',
    'NOTE -.-> API',
    'NOTE -.-> DB',
    `class SRV ${STATUS_META.unknown.cssClass}`,
  ]),
  usesStatus: true,
  sources: [
    {
      kind: 'doc',
      ref: 'docs/arquitectura/04-despliegue-y-conceptos.md:80-92',
      note: 'Qué cambia entre el entorno local y el servidor: reinicio, logs, respaldo, TLS pendiente',
    },
    {
      kind: 'adr',
      ref: 'docs/adr/0011-un-compose-dos-entornos.md',
      note: 'Un compose, o una VM si no hay servidor',
    },
    {
      kind: 'adr',
      ref: 'docs/adr/0016-autorizacion-por-proyecto-y-sesion.md:59',
      note: 'Los puertos de la base y la API dejan de publicarse en toda la red (propuesto)',
    },
    {
      kind: 'doc',
      ref: 'docs/arquitectura/07-pendientes.md:8-9',
      note: 'S2 (servidor) y S3 (acceso externo y TLS): el documento no registra respuesta',
    },
    {
      kind: 'doc',
      ref: 'docs/arquitectura/07-pendientes.md:20',
      note: 'S14 (repositorio institucional y CI)',
    },
    {
      kind: 'doc',
      ref: 'docs/arquitectura/05-calidad-y-riesgos.md:38',
      note: 'R13: el servidor no está disponible a tiempo',
    },
    {
      kind: 'config',
      ref: 'compose.yaml',
      note: 'Hoy: cuatro servicios, sin reinicio ni límite de logs',
    },
  ],
  priority: 'P0',
};

export const diagrams: readonly DiagramDef[] = [FINAL_STATE, SCREEN_MAP, ACCEPTANCE_STEPS];
