/**
 * The things the page shows as planned or undecided, each with a tripwire.
 *
 * A diagram that draws one of these reads its status from here (`g()` / `c()` in `diagramKit`),
 * and a test checks the repository: when someone builds the thing, the test fails and says which
 * entry to update, so the page cannot keep saying "planned" about something that exists.
 */
import type { Status } from './status';

export type FeatureId =
  | 'editor'
  | 'simpleViewer'
  | 'classesScreen'
  | 'importScreen'
  | 'exportScreen'
  | 'ci'
  | 'smoke'
  | 'fetchSamples'
  | 'backup'
  | 'composeServer'
  | 'codeowners'
  | 'sessionValidator'
  | 'csrfGuard'
  | 'yolo'
  | 'tls'
  | 'httpTests';

export interface FeatureDef {
  label: string;
  status: Status;
  /** One sentence on what is missing; required because the status is not `done`. */
  gap: string;
  /** Repo-relative globs that must match no file while the item is not built. */
  absentPaths?: readonly string[];
  /** Raw-source search that must find nothing while the item is not built. */
  absentText?: { in: readonly string[]; except?: readonly string[]; pattern: string };
}

/** Paths of the guide itself, which mention the planned items by name. */
const GUIDE = ['web/src/features/gia/**'] as const;

export const FEATURES: Record<FeatureId, FeatureDef> = {
  editor: {
    label: 'Editor de anotaciones',
    status: 'planned',
    gap: 'La interfaz de anotación no está construida; el reparto del editor (ADR-08) espera a la supervisión.',
    absentPaths: ['web/src/features/annotations/**'],
  },
  simpleViewer: {
    label: 'Visor simple para probar el editor',
    status: 'planned',
    gap: 'Falta un visor sin teselas para desarrollar el editor sin servicio de teselas.',
    absentText: { in: ['web/src/**'], except: GUIDE, pattern: 'SimpleImageViewer' },
  },
  classesScreen: {
    label: 'Pantalla de clases',
    status: 'planned',
    gap: 'La API tiene las operaciones de clases; la interfaz todavía no tiene pantalla para administrarlas.',
    absentText: { in: ['web/src/**'], except: GUIDE, pattern: '/classes' },
  },
  importScreen: {
    label: 'Pantalla de importación',
    status: 'planned',
    gap: 'La API importa CRIC; la interfaz todavía no tiene pantalla de importación.',
    absentText: { in: ['web/src/**'], except: GUIDE, pattern: '/imports' },
  },
  exportScreen: {
    label: 'Pantalla de exportación',
    status: 'planned',
    gap: 'La API exporta JSON interno y COCO; la interfaz todavía no tiene pantalla de exportación.',
    absentText: { in: ['web/src/**'], except: GUIDE, pattern: '/export' },
  },
  ci: {
    label: 'Integración continua',
    status: 'planned',
    gap: 'No hay flujo de integración continua; la verificación del contrato y las pruebas se corren a mano.',
    absentPaths: ['.github/**'],
  },
  smoke: {
    label: 'Prueba de humo del despliegue',
    status: 'planned',
    gap: 'No existe el script que comprueba un despliegue recién levantado.',
    absentPaths: ['scripts/smoke.sh'],
  },
  fetchSamples: {
    label: 'Descarga de imágenes de muestra',
    status: 'planned',
    gap: 'No existe el script que baja el conjunto de imágenes de prueba.',
    absentPaths: ['scripts/fetch-samples.*'],
  },
  backup: {
    label: 'Respaldo y restauración de la base',
    status: 'planned',
    gap: 'No existen los scripts de respaldo y restauración de la base de datos.',
    absentPaths: ['scripts/backup-db.*', 'scripts/restore-db.*'],
  },
  composeServer: {
    label: 'Compose del servidor',
    status: 'planned',
    gap: 'No existe la variante de Compose para el servidor del laboratorio.',
    absentPaths: ['compose.server.yaml'],
  },
  codeowners: {
    label: 'Responsables por carpeta',
    status: 'planned',
    gap: 'No hay archivo de responsables por carpeta (CODEOWNERS).',
    absentPaths: ['CODEOWNERS', '.github/CODEOWNERS', 'docs/CODEOWNERS'],
  },
  sessionValidator: {
    label: 'Validación de sesión en cada pedido',
    status: 'planned',
    gap: 'El rol global viaja en la cookie y no se revalida; el validador de sesión (ADR-16) está propuesto.',
    absentText: { in: ['api/src/**'], pattern: 'SessionValidator|OnValidatePrincipal' },
  },
  csrfGuard: {
    label: 'Guarda contra CSRF (Sec-Fetch-Site)',
    status: 'planned',
    gap: 'No hay guarda de origen del pedido en la API; está propuesta en el ADR-16.',
    absentText: { in: ['api/src/**'], pattern: 'FetchMetadataGuard|Sec-Fetch-Site' },
  },
  yolo: {
    label: 'Exportación YOLO',
    status: 'planned',
    gap: 'YOLO solo entra si sobra tiempo (ADR-10); hoy la API responde unsupported-format.',
    absentText: { in: ['api/src/**'], pattern: 'Yolo' },
  },
  tls: {
    label: 'TLS y acceso externo',
    status: 'unknown',
    gap: 'Falta definir con la supervisión si el acceso es solo de la red del laboratorio y quién termina TLS.',
    absentText: { in: ['deploy/gateway/**'], pattern: 'ssl_certificate|listen 443' },
  },
  httpTests: {
    label: 'Pruebas de la API por HTTP',
    status: 'planned',
    gap: 'Las pruebas de la API no atraviesan la capa HTTP; no hay WebApplicationFactory.',
    absentText: { in: ['api/tests/**'], pattern: 'WebApplicationFactory' },
  },
};
