/**
 * The five acceptance steps both PPS statements require for the final demonstration. One list
 * feeds the `aceptacion` diagram and the `aceptacion` table, so the mark of a step cannot differ
 * between them.
 */
import { FEATURES } from '../../model/features';
import type { Status } from '../../model/status';

export interface AcceptanceCriterion {
  id: string;
  /** Lines of the diagram node, without the glyph; each at most 38 characters. */
  lines: readonly string[];
  /** Full wording shown in the table. */
  criterion: string;
  /** How it can be shown today. */
  today: string;
  /** What is still missing. */
  missing: string;
  status: Status;
}

/** "a, b y c": the Spanish way to close a list. */
function joinList(items: readonly string[]): string {
  const head = items.slice(0, -1);
  const last = items.at(-1);
  if (last === undefined) return '';
  return head.length === 0 ? last : `${head.join(', ')} y ${last}`;
}

/** Operation pieces of the final deployment that do not exist yet, read from the tripwires. */
const MISSING_SERVER_PIECES = [
  FEATURES.composeServer,
  FEATURES.smoke,
  FEATURES.fetchSamples,
  FEATURES.ci,
]
  .filter((feature) => feature.status !== 'done')
  .map((feature) => feature.label.toLowerCase());

export const ACCEPTANCE: readonly AcceptanceCriterion[] = [
  {
    id: 'importar',
    lines: ['Importar un subconjunto de CRIC', 'o CCEDD y una WSI'],
    criterion: 'Importar un subconjunto de CRIC o CCEDD y una WSI de prueba',
    today: 'El importador de CRIC por API, con simulación previa, y el registro de archivos SVS.',
    missing:
      'Definir el subconjunto y la WSI de prueba (S4, S6); CCEDD sin importador; sin pantalla de importación.',
    status: 'partial',
  },
  {
    id: 'anotar',
    lines: ['Anotar una imagen convencional', 'y una WSI', 'hoy solo por HTTP'],
    criterion: 'Anotar al menos una imagen convencional y una WSI',
    today:
      'Solo por HTTP, con el script de aceptación de nivel API (scripts/test_acceptance_i3.py).',
    missing: 'El editor de anotaciones en la interfaz: su reparto sigue pendiente (ADR-08, S1).',
    status: 'partial',
  },
  {
    id: 'verificar',
    lines: ['Verificar clase, autor', 'y geometría'],
    criterion: 'Verificar la clase, el autor y la geometría de lo anotado',
    today:
      'La respuesta de la API, la exportación (JSON interno y COCO) y las pruebas de autoría del servidor.',
    missing: 'Sin faltante en el servidor; la interfaz todavía no muestra anotaciones.',
    status: 'done',
  },
  {
    id: 'exportar',
    lines: ['Exportar el resultado', 'por API'],
    criterion: 'Exportar el resultado',
    today:
      'Exportación por API en JSON interno y COCO; por defecto exporta solo las anotaciones propias.',
    missing: 'Pantalla de exportación; YOLO responde 422 (formato condicional, ADR-10).',
    status: 'partial',
  },
  {
    id: 'servidor',
    lines: ['Levantar todo con la documentación', 'en el servidor'],
    criterion:
      'Levantar la solución con la documentación entregada: en el servidor del laboratorio (PPS 1) y con Docker Compose (PPS 2)',
    today:
      'Docker Compose de cuatro servicios en la máquina local, descrito en el README; el ensayo desde cero en una máquina limpia no está verificado.',
    missing: `Servidor del laboratorio sin fecha ni acceso registrados (S2, S3). Faltan ${joinList([
      ...MISSING_SERVER_PIECES,
      'manual de uso',
    ])}.`,
    status: 'planned',
  },
];
