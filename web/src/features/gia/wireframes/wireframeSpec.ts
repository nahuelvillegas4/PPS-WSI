/**
 * Content of the four proposed screens, as data. There is no interface specification in the
 * repository, so every sketch says so, and every element names where it comes from: the contract
 * operation (`operationId` of `contract/openapi/api.v1.yaml`) it would call, or "propuesta de
 * diseño" when no operation backs it. A test checks the operations against the contract file.
 */
import { FEATURES } from '../model/features';
import { STATUS_META } from '../model/status';

export type WireframeId = 'editor' | 'import' | 'export' | 'classes';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

/** Where an element comes from: a contract operation, or a design proposal. */
export type WireSource =
  | { kind: 'operation'; method: HttpMethod; operationId: string; detail?: string }
  | { kind: 'design' };

export type WireKind =
  'toolbar' | 'select' | 'field' | 'checkbox' | 'button' | 'canvas' | 'list' | 'notice' | 'report';

export interface WireItem {
  label: string;
  /** Shown but not usable: a proposal that does not exist yet. */
  disabled?: boolean;
}

export interface WireElement {
  /** Unique within its wireframe. */
  id: string;
  kind: WireKind;
  label: string;
  items?: readonly WireItem[];
  source: WireSource;
}

/** `top` and `bottom` span the width; `main` and `side` share the middle band. */
export type WireArea = 'top' | 'main' | 'side' | 'bottom';

export interface WireRegion {
  id: string;
  area: WireArea;
  elements: readonly WireElement[];
}

export interface WireframeSpec {
  id: WireframeId;
  title: string;
  caption: string;
  regions: readonly WireRegion[];
}

/** The banner every sketch carries. */
export const WIREFRAME_BANNER =
  'PROPUESTA, no implementado; no hay especificación de interfaz en el repositorio';

/** The tag of an element no contract operation backs. */
export const DESIGN_TAG = 'propuesta de diseño';

export const WIREFRAME_LEGEND =
  'Cada elemento indica la operación del contrato que usaría (método y nombre) o "propuesta de diseño" cuando ningún contrato lo respalda.';

const DESIGN: WireSource = { kind: 'design' };

function op(method: HttpMethod, operationId: string, detail?: string): WireSource {
  return detail === undefined
    ? { kind: 'operation', method, operationId }
    : { kind: 'operation', method, operationId, detail };
}

/** The text of the tag of an element: "GET listClasses" or "POST importAnnotations · dryRun". */
export function formatSourceTag(source: WireSource): string {
  if (source.kind === 'design') return DESIGN_TAG;
  const base = `${source.method} ${source.operationId}`;
  return source.detail === undefined ? base : `${base} · ${source.detail}`;
}

/** Regions of a wireframe in one area, in the order they were declared. */
export function regionsIn(spec: WireframeSpec, area: WireArea): readonly WireRegion[] {
  return spec.regions.filter((region) => region.area === area);
}

/** Every element of a wireframe, regions in order. */
export function elementsOf(spec: WireframeSpec): readonly WireElement[] {
  return spec.regions.flatMap((region) => region.elements);
}

/** YOLO is a planned format: its label follows the tripwire, so it stops saying so once built. */
const YOLO_ITEM: WireItem = {
  label: `YOLO · ${STATUS_META[FEATURES.yolo.status].label.toLowerCase()}`,
  disabled: FEATURES.yolo.status !== 'done',
};

export const WIREFRAMES: Readonly<Record<WireframeId, WireframeSpec>> = {
  editor: {
    id: 'editor',
    title: 'Boceto del editor de anotaciones',
    caption:
      'Se abriría desde el visor de una imagen. Hoy el visor solo permite acercar, alejar y ver la imagen completa.',
    regions: [
      {
        id: 'top',
        area: 'top',
        elements: [
          {
            id: 'tools',
            kind: 'toolbar',
            label: 'Barra de herramientas',
            items: [{ label: 'Seleccionar' }, { label: 'Rectángulo' }, { label: 'Polígono' }],
            source: DESIGN,
          },
          {
            id: 'class',
            kind: 'select',
            label: 'Clase de la figura',
            items: [{ label: 'Clases del dataset' }],
            source: op('GET', 'listClasses'),
          },
        ],
      },
      {
        id: 'main',
        area: 'main',
        elements: [
          {
            id: 'canvas',
            kind: 'canvas',
            label: 'Lienzo de dibujo sobre el visor',
            source: DESIGN,
          },
          {
            id: 'conflict',
            kind: 'notice',
            label:
              'La anotación cambió desde que se abrió; recargarla para ver la versión vigente.',
            source: op('PATCH', 'updateAnnotation', '412'),
          },
        ],
      },
      {
        id: 'side',
        area: 'side',
        elements: [
          {
            id: 'authors',
            kind: 'select',
            label: 'Filtro de autores',
            items: [{ label: 'Propias' }, { label: 'Todas' }],
            source: op('GET', 'listAnnotations', 'author'),
          },
          {
            id: 'list',
            kind: 'list',
            label: 'Anotaciones de la imagen',
            items: [{ label: 'Figura 1' }, { label: 'Figura 2' }, { label: 'Figura 3' }],
            source: op('GET', 'listAnnotations'),
          },
          {
            id: 'author-date',
            kind: 'field',
            label: 'Autor y fecha de la anotación elegida',
            source: op('GET', 'listAnnotations', 'authorUsername, createdAt'),
          },
        ],
      },
      {
        id: 'bottom',
        area: 'bottom',
        elements: [
          {
            id: 'save',
            kind: 'button',
            label: 'Guardar figura nueva',
            source: op('POST', 'createAnnotation', 'el servidor fija el autor'),
          },
          {
            id: 'edit',
            kind: 'button',
            label: 'Guardar cambios de clase o geometría',
            source: op('PATCH', 'updateAnnotation', 'If-Match'),
          },
          {
            id: 'delete',
            kind: 'button',
            label: 'Borrar una anotación propia',
            source: op('DELETE', 'deleteAnnotation'),
          },
        ],
      },
    ],
  },
  import: {
    id: 'import',
    title: 'Boceto de la pantalla de importación',
    caption:
      'Solo para la administración global: la API lee una carpeta del volumen de imágenes y no recibe archivos del navegador.',
    regions: [
      {
        id: 'top',
        area: 'top',
        elements: [
          {
            id: 'source',
            kind: 'field',
            label: 'Carpeta del volumen de imágenes',
            source: op('POST', 'importAnnotations', 'source'),
          },
          {
            id: 'format',
            kind: 'select',
            label: 'Formato',
            items: [{ label: 'CRIC' }],
            source: op('POST', 'importAnnotations', 'format'),
          },
          {
            id: 'dry-run',
            kind: 'checkbox',
            label: 'Simulación previa, activada por defecto',
            source: op('POST', 'importAnnotations', 'dryRun'),
          },
        ],
      },
      {
        id: 'main',
        area: 'main',
        elements: [
          {
            id: 'run',
            kind: 'button',
            label: 'Simular o importar',
            source: op('POST', 'importAnnotations', '200 simulación, 201 importación'),
          },
          {
            id: 'report',
            kind: 'report',
            label: 'Informe',
            items: [
              { label: 'Imágenes: encontradas, registradas, omitidas' },
              { label: 'Clases: coincidentes, creadas' },
              { label: 'Anotaciones: creadas, omitidas' },
              { label: 'Advertencias' },
            ],
            source: op('POST', 'importAnnotations', 'informe'),
          },
        ],
      },
      {
        id: 'side',
        area: 'side',
        elements: [
          {
            id: 'repeated',
            kind: 'notice',
            label: 'Esta carpeta ya se importó en el dataset.',
            source: op('POST', 'importAnnotations', '409 already-imported'),
          },
          {
            id: 'admin-only',
            kind: 'notice',
            label: 'Solo la administración global puede importar.',
            source: op('POST', 'importAnnotations', '403 a los demás roles'),
          },
        ],
      },
    ],
  },
  export: {
    id: 'export',
    title: 'Boceto de la pantalla de exportación',
    caption:
      'Para quien administra el proyecto del dataset. La descarga la hace el navegador; la interfaz no interpreta el archivo.',
    regions: [
      {
        id: 'top',
        area: 'top',
        elements: [
          {
            id: 'format',
            kind: 'select',
            label: 'Formato',
            items: [{ label: 'Interno' }, { label: 'COCO' }, YOLO_ITEM],
            source: op('GET', 'exportDataset', 'format'),
          },
          {
            id: 'authors',
            kind: 'select',
            label: 'Autores',
            items: [{ label: 'Propias (por defecto)' }, { label: 'Todos' }, { label: 'Elegir' }],
            source: op('GET', 'exportDataset', 'authors'),
          },
        ],
      },
      {
        id: 'main',
        area: 'main',
        elements: [
          {
            id: 'download',
            kind: 'button',
            label: 'Descargar',
            source: op('GET', 'exportDataset', '200, archivo adjunto'),
          },
          {
            id: 'unsupported',
            kind: 'notice',
            label: 'Ese formato todavía no está disponible.',
            source: op('GET', 'exportDataset', '422 unsupported-format'),
          },
        ],
      },
      {
        id: 'side',
        area: 'side',
        elements: [
          {
            id: 'role',
            kind: 'notice',
            label: 'Hace falta administrar el proyecto del dataset.',
            source: op('GET', 'exportDataset', '403 al anotador y al lector'),
          },
        ],
      },
    ],
  },
  classes: {
    id: 'classes',
    title: 'Boceto de la pantalla de clases',
    caption:
      'Las clases de un dataset: la API ya tiene las cuatro operaciones y la interfaz no tiene ninguna pantalla para usarlas.',
    regions: [
      {
        id: 'main',
        area: 'main',
        elements: [
          {
            id: 'list',
            kind: 'list',
            label: 'Clases del dataset: nombre, color y orden',
            items: [{ label: 'Clase 1' }, { label: 'Clase 2' }, { label: 'Clase 3' }],
            source: op('GET', 'listClasses'),
          },
        ],
      },
      {
        id: 'side',
        area: 'side',
        elements: [
          {
            id: 'name',
            kind: 'field',
            label: 'Nombre (1 a 64 caracteres)',
            source: op('POST', 'createClass', 'name'),
          },
          {
            id: 'color',
            kind: 'field',
            label: 'Color (#RRGGBB)',
            source: op('POST', 'createClass', 'color'),
          },
          {
            id: 'order',
            kind: 'field',
            label: 'Orden de visualización',
            source: op('POST', 'createClass', 'displayOrder'),
          },
          {
            id: 'duplicate',
            kind: 'notice',
            label: 'Ya existe una clase con ese nombre.',
            source: op('POST', 'createClass', '409 duplicate-name'),
          },
        ],
      },
      {
        id: 'bottom',
        area: 'bottom',
        elements: [
          {
            id: 'edit',
            kind: 'button',
            label: 'Editar clase',
            source: op('PATCH', 'updateClass'),
          },
          {
            id: 'delete',
            kind: 'button',
            label: 'Borrar clase',
            source: op('DELETE', 'deleteClass'),
          },
          {
            id: 'in-use',
            kind: 'notice',
            label: 'No se puede borrar: la clase tiene anotaciones.',
            source: op('DELETE', 'deleteClass', '409 class-in-use'),
          },
        ],
      },
    ],
  },
};
