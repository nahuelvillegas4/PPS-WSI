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
  text: 'GIA es una herramienta web para ver y anotar imágenes de patología digital de gran tamaño (WSI). Las anotaciones son rectángulos y polígonos que conservan clase, autor y fecha, y se exportan para entrenar modelos; GIA no entrena ni ejecuta modelos. Cada persona ve y anota según su rol en cada proyecto.',
};

const stats: Block = {
  kind: 'stats',
  items: [
    { value: String(FACTS.operations), label: 'operaciones de la API' },
    { value: String(FACTS.tileOperations), label: 'operaciones de teselas' },
    { value: String(FACTS.tables), label: 'tablas' },
    { value: String(FACTS.screens), label: 'pantallas' },
    { value: String(FACTS.adrs), label: 'decisiones (ADR)' },
    { value: String(FACTS.requirements), label: 'requisitos de las dos PPS' },
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
  text: `${legendLine}. En los diagramas, el borde continuo marca lo construido y el punteado, lo que falta.`,
};

/** Out of scope in both statements: documented as extensions, none of it built. */
const outOfScope: readonly Block[] = [
  {
    kind: 'callout',
    tone: 'info',
    title: 'Fuera de alcance',
    text: 'Los dos enunciados lo dejan fuera. Está documentado como extensión, con el lugar donde se enchufaría; nada de esto está construido.',
  },
  {
    kind: 'list',
    items: [
      'Consenso y adjudicación entre revisores, y métricas de acuerdo entre observadores',
      'Edición colaborativa en tiempo real',
      'DICOM WSI: se trabaja con una única familia de WSI (SVS)',
      'Ejecución de modelos de inteligencia artificial y preanotaciones',
      'Aprendizaje activo (active learning)',
      'Paneles de control (dashboards)',
      'Versionado integral de datasets',
      'Formatos universales de intercambio',
    ],
  },
];

export const content: StopContent = {
  section: {
    id: 'que-es',
    group: 'recorrido',
    title: 'Qué es GIA',
    headline:
      'GIA es un visor y anotador web de imágenes médicas gigantes, con permisos por proyecto.',
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
        id: 'quien-hace-que',
        label: 'Quién hace qué',
        blocks: [{ kind: 'diagram', id: repartoPps.id }],
      },
    ],
    notes: [
      'El servidor está completo; lo que falta es el editor en el navegador.',
      'Servidor quiere decir la API y el servicio de teselas; el servidor del laboratorio es otra cosa y todavía no tiene fecha.',
      'Señalar en el flujo el paso donde se corta, Anotar, y explicar la leyenda: el borde continuo es lo construido y el punteado, lo que falta.',
      `Las cifras de la portada se cuentan del repositorio al ${SNAPSHOT.label}; no se escriben a mano.`,
    ],
    detail: outOfScope,
  },
  diagrams: [repartoPps],
  tables: [],
};
