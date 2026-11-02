/**
 * Annex A6, "Glosario": the terms the page uses, one line each. Numbers come from `FACTS` and the
 * status of anything planned from `FEATURES`, so a definition cannot keep saying "planificado"
 * about something that now exists.
 */
import { FACTS } from '../model/facts';
import { FEATURES } from '../model/features';
import { STATUS_META } from '../model/status';
import type { Cell, Section, StopContent, TableDef } from '../model/types';

/** Lower-case Spanish name of the status of a planned item ("planificado", "sin decidir"). */
function statusWord(feature: keyof typeof FEATURES): string {
  return STATUS_META[FEATURES[feature].status].label.toLowerCase();
}

interface GlossaryEntry {
  /** The term as the page writes it; code-like terms are shown in monospace. */
  term: string;
  mono?: true;
  meaning: string;
}

/** Alphabetical; each term appears once (a test checks it, ignoring case). */
export const GLOSSARY: readonly GlossaryEntry[] = [
  {
    term: 'ADR',
    meaning: `Architecture Decision Record: registro corto de una decisión de arquitectura. El repositorio tiene ${FACTS.adrs}, cada uno DECIDIDO o PROPUESTO.`,
  },
  {
    term: 'auth_request',
    mono: true,
    meaning:
      'Directiva de Nginx que consulta a la API antes de servir una tesela; solo admite respuestas 2xx, 401 y 403.',
  },
  {
    term: 'CCEDD',
    meaning:
      'Otra base pública de imágenes, con polígonos en formato labelme, que los enunciados admiten en lugar de CRIC. No tiene importador; su fuente y licencia están por verificar.',
  },
  {
    term: 'COCO',
    meaning:
      'Formato externo de anotaciones en JSON. La API lo exporta con format=coco; es el formato externo obligatorio.',
  },
  {
    term: 'contrato',
    meaning: `La carpeta contract/: dos descripciones OpenAPI (${FACTS.operations} operaciones de la API y ${FACTS.tileOperations} de teselas), esquemas JSON, casos numéricos y la matriz de autorización.`,
  },
  {
    term: 'CRIC',
    meaning:
      'Base pública de imágenes (CRIC Cervix) con anotaciones de puntos y clase Bethesda; es la que importa la API. Formato y licencia por verificar.',
  },
  {
    term: 'CSP',
    meaning:
      'Content-Security-Policy: cabecera que limita qué scripts y estilos puede cargar una página. La pasarela todavía no la define.',
  },
  {
    term: 'CSRF',
    meaning: `Falsificación de petición en sitios cruzados: otro sitio hace que el navegador envíe un pedido con la cookie de la persona. La guarda con Sec-Fetch-Site está propuesta en el ADR-16 (${statusWord('csrfGuard')}).`,
  },
  {
    term: 'dryRun',
    mono: true,
    meaning:
      'Opción de la importación: simula, valida y devuelve el informe sin escribir nada. Es el valor por defecto.',
  },
  {
    term: 'DZI',
    meaning:
      'Deep Zoom Image: un descriptor XML más una pirámide de teselas. El servicio de teselas lo genera al vuelo, con teselas JPEG de 254 px y solape de 1 px.',
  },
  {
    term: 'E1 a E11',
    meaning:
      'Las épicas de trabajo del documento de arquitectura, por ejemplo E6 es el editor en el navegador.',
  },
  {
    term: 'ETag',
    mono: true,
    meaning:
      'Versión de una anotación. Para editarla hay que enviarla en If-Match: 412 si cambió desde que se leyó, 428 si falta.',
  },
  {
    term: 'I0 a I5',
    meaning: 'Los incrementos de la hoja de ruta, de la base (I0) al cierre de la PPS 1 (I5).',
  },
  {
    term: 'membresía',
    meaning:
      'Pertenencia de una persona a un proyecto con un rol: lector, anotador o administrador del proyecto. Se guarda en la tabla project_members.',
  },
  {
    term: 'nivel 0',
    meaning:
      'La imagen a resolución completa. Toda geometría se guarda en píxeles de nivel 0, con el origen arriba a la izquierda, sin importar el zoom (ADR-06).',
  },
  {
    term: 'OpenSeadragon',
    meaning: 'Biblioteca del navegador que dibuja el visor y pide las teselas.',
  },
  {
    term: 'OpenSlide',
    meaning:
      'Biblioteca que lee archivos de láminas completas, como SVS; la usa el servicio de teselas.',
  },
  {
    term: 'P1 a P24',
    meaning:
      'Las preguntas abiertas de la guía de estudio «Del vidrio al dataset» (§9), a las que remiten los pendientes para la supervisión.',
  },
  {
    term: 'pasarela',
    meaning:
      'El Nginx que es el único punto de entrada: entrega la interfaz y reenvía /api/ a la API y /tiles/ al servicio de teselas.',
  },
  {
    term: 'PPS',
    meaning:
      'Práctica Profesional Supervisada. La PPS 1 hace el visor, las teselas y la interfaz; la PPS 2, la API de gestión, la persistencia, la importación y la exportación.',
  },
  {
    term: 'QS',
    meaning:
      'Escenario de calidad (QS-1 a QS-10) del documento de arquitectura; cada uno fija un objetivo a verificar.',
  },
  {
    term: 'R1 a R15',
    meaning:
      'Los riesgos del documento de arquitectura, por ejemplo R13 es que el servidor no esté disponible a tiempo.',
  },
  {
    term: 'rol global',
    meaning:
      'El rol de la cuenta: administrador (admin) o usuario (user). La administración global actúa como administrador del proyecto en todos los proyectos.',
  },
  {
    term: 'S1 a S19',
    meaning:
      'Los pendientes para la supervisión del documento de arquitectura, cada uno con una propuesta del equipo.',
  },
  {
    term: 'SPA',
    meaning:
      'Aplicación web de una sola página: la carpeta web/, hecha con React y un enrutador propio.',
  },
  {
    term: 'SVS',
    meaning:
      'Formato de láminas completas de Aperio; es la única familia WSI que admite el sistema.',
  },
  {
    term: 'tesela',
    meaning:
      'Recorte cuadrado de un nivel de la pirámide de una imagen; aquí, un JPEG de 254 px con solape de 1 px.',
  },
  {
    term: 'TLS',
    meaning: `Cifrado de las conexiones HTTPS. Hoy el sistema no lo usa; quién lo termina, el servidor o un proxy del laboratorio, está ${statusWord('tls')} (S3).`,
  },
  {
    term: 'WSI',
    meaning:
      'Whole Slide Image: imagen de una lámina de patología digitalizada completa. Es tan grande que el navegador nunca la descarga entera: se muestra por teselas.',
  },
  {
    term: 'YOLO',
    meaning: `Otro formato externo de anotaciones; solo entra si sobra tiempo (ADR-10). Hoy la API responde 422 unsupported-format (${statusWord('yolo')}).`,
  },
];

/** The cell for a term: monospace for identifiers, plain text for words. */
function termCell(entry: GlossaryEntry): Cell {
  return entry.mono ? { mono: entry.term } : entry.term;
}

const table: TableDef = {
  id: 'glosario',
  title: 'Glosario',
  caption: 'Los términos y siglas que usa la página, en orden alfabético.',
  columns: [
    { key: 'termino', label: 'Término' },
    { key: 'linea', label: 'Una línea' },
  ],
  rows: GLOSSARY.map((entry) => ({ termino: termCell(entry), linea: entry.meaning })),
  sources: [
    { kind: 'adr', ref: 'docs/adr/README.md', note: 'Estados de los ADR' },
    {
      kind: 'doc',
      ref: 'docs/arquitectura/07-pendientes.md',
      note: 'S1 a S19 y su relación con P1 a P24',
    },
    {
      kind: 'doc',
      ref: 'docs/arquitectura/anexo-d-referencias.md:10',
      note: 'La guía de estudio de las preguntas P1 a P24',
    },
    {
      kind: 'doc',
      ref: 'docs/arquitectura/05-calidad-y-riesgos.md',
      note: 'QS-1 a QS-10 y R1 a R15',
    },
    {
      kind: 'doc',
      ref: 'docs/arquitectura/06-organizacion-y-roadmap.md',
      note: 'Incrementos y épicas',
    },
    {
      kind: 'contract',
      ref: 'contract/openapi/api.v1.yaml',
      note: 'ETag, dryRun, formatos de importación y exportación',
    },
    { kind: 'config', ref: 'deploy/gateway/nginx.conf', note: 'Pasarela y auth_request' },
    { kind: 'adr', ref: 'docs/adr/0009-importacion-por-adaptadores.md', note: 'CRIC y CCEDD' },
  ],
};

const section: Section = {
  id: 'a6-glosario',
  group: 'anexo',
  title: 'Glosario',
  headline: 'Referencia: términos usados en esta página.',
  tabs: [{ id: 'terminos', label: 'Términos', blocks: [{ kind: 'table', id: 'glosario' }] }],
  notes: [
    'Este anexo define las siglas y términos que usa la página.',
    'Se consulta si alguien pregunta por una sigla; no forma parte del recorrido.',
  ],
};

export const content: StopContent = { section, diagrams: [], tables: [table] };
