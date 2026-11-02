import { ADRS } from '../../data/adrs';
import { FACTS } from '../../model/facts';
import { SNAPSHOT, STATUS_META, type Status } from '../../model/status';
import type { Block, StopContent } from '../../model/types';
import { repartoPps } from './diagrams';
import { buildFlowSteps } from './steps';

/** Copy C2: what the access restriction is and is not. Used verbatim in the cover. */
export const ACCESS_NOTICE =
  'Visible solo para una sesión con rol administrador global. El contenido no es secreto y la restricción es de la interfaz, no del servidor.';

const STATUS_ORDER: readonly Status[] = ['done', 'partial', 'planned', 'unknown'];

/** "● Implementado · ◐ Parcial · ○ Planificado · ? Sin decidir", read from the status table. */
const legendLine = STATUS_ORDER.map(
  (status) => `${STATUS_META[status].glyph} ${STATUS_META[status].label}`,
).join(' · ');

const cover: Block = {
  kind: 'callout',
  tone: 'info',
  title: 'GIA · Guía del sistema',
  text: `Gino Tombesi (PPS 1) · Nahuel Villegas (PPS 2) · Datos al ${SNAPSHOT.label} · commit ${SNAPSHOT.commit}`,
};

const accessNotice: Block = { kind: 'callout', tone: 'info', text: ACCESS_NOTICE };

const purpose: Block = {
  kind: 'callout',
  tone: 'info',
  title: 'Para qué sirve',
  text: 'GIA es una herramienta web para ver imágenes de patología digital de gran tamaño (WSI) y, por la API, anotarlas; el editor en el navegador falta. Las anotaciones son rectángulos y polígonos que conservan clase, autor y fecha, y se exportan para entrenar modelos; GIA no entrena ni ejecuta modelos. Los permisos por proyecto ya están en la rama main, pero los ADR-15 y ADR-16 son propuestas sin aprobación registrada.',
};

const adrsDecided = ADRS.filter((adr) => adr.decision === 'DECIDIDO').length;
const adrsProposed = ADRS.filter((adr) => adr.decision === 'PROPUESTO').length;

const stats: Block = {
  kind: 'stats',
  items: [
    { value: String(FACTS.operations), label: 'operaciones de la API' },
    { value: String(FACTS.tileOperations), label: 'operaciones de teselas' },
    { value: String(FACTS.tables), label: 'tablas' },
    { value: String(FACTS.screens), label: 'pantallas' },
    {
      value: String(FACTS.adrs),
      label: `ADR (${String(adrsDecided)} decididos, ${String(adrsProposed)} propuestos)`,
    },
    { value: String(FACTS.requirements), label: 'requisitos (desglose propio de los enunciados)' },
  ],
};

/** The stepper block has no title of its own, so this callout carries its heading. */
const flowIntro: Block = {
  kind: 'callout',
  tone: 'info',
  title: 'El flujo completo',
  text: 'Los siete pasos del producto, de ingresar a exportar. Cada paso muestra el estado del servidor (API) y el de la interfaz (Web).',
};

const legend: Block = {
  kind: 'callout',
  tone: 'info',
  title: 'Cómo leer el estado',
  text: `${legendLine}. En los diagramas, el borde continuo marca lo construido y lo construido en parte (lo parcial se distingue por el glifo ◐); el borde discontinuo, lo planificado, y el de puntos, lo sin decidir.`,
};

/**
 * Out of scope in the statements. The architecture document (section 5.4) gives an extension
 * point for five of the eight; two of the other three are only named as out of scope and the
 * collaborative editing is not even named in the repository. Nothing here is built.
 */
const outOfScope: readonly Block[] = [
  {
    kind: 'callout',
    tone: 'info',
    title: 'Fuera de alcance',
    text: 'Los enunciados dejan todo esto fuera; la edición colaborativa, solo el de la PPS 2. La arquitectura (sección 5.4) da un punto de extensión para cinco de los ocho; los otros tres no lo tienen. Nada de esto está construido.',
  },
  {
    kind: 'list',
    items: [
      'Consenso y adjudicación entre revisores, y métricas de acuerdo entre observadores · punto de extensión',
      'Edición colaborativa en tiempo real · solo en el enunciado de la PPS 2; la documentación del repositorio no la menciona',
      'DICOM WSI: se trabaja con una única familia de WSI (SVS) · punto de extensión',
      'Ejecución de modelos de inteligencia artificial y preanotaciones · punto de extensión',
      'Aprendizaje activo (active learning) · punto de extensión',
      'Paneles de control (dashboards) · solo nombrado como fuera de alcance',
      'Versionado integral de datasets · solo nombrado como fuera de alcance',
      'Formatos universales de intercambio · punto de extensión (nuevos formatos)',
    ],
  },
];

export const content: StopContent = {
  section: {
    id: 'que-es',
    group: 'recorrido',
    title: 'Qué es GIA',
    headline: 'GIA es un visor web de imágenes médicas gigantes; hoy se anota solo por la API.',
    minutes: 1.5,
    tabs: [
      {
        id: 'resumen',
        label: 'Resumen',
        blocks: [
          cover,
          accessNotice,
          purpose,
          stats,
          flowIntro,
          { kind: 'stepper', steps: buildFlowSteps() },
          legend,
        ],
      },
      {
        id: 'reparto-previsto',
        label: 'Reparto previsto',
        blocks: [{ kind: 'diagram', id: repartoPps.id }],
      },
    ],
    notes: [
      `La API y las teselas implementan las ${String(FACTS.operations + FACTS.tileOperations)} operaciones del contrato; en el navegador faltan el editor y tres pantallas.`,
      'Quedan propuestas de seguridad (ADR-16), YOLO y las pruebas por HTTP. El servidor del laboratorio es otra cosa: no tiene fecha ni acceso confirmados.',
      'Señalar en el flujo dónde se corta en el navegador: primero en las clases (paso 2) y después en Anotar (paso 5). Explicar la leyenda: continuo, construido; discontinuo, planificado.',
      'Las cifras de la portada están escritas una vez y una prueba las compara con el repositorio; el 79 es el desglose propio del anexo A2.',
    ],
    detail: outOfScope,
  },
  diagrams: [repartoPps],
  tables: [],
};
