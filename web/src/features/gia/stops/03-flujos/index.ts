import type { Section, StopContent } from '../../model/types';
import { diagrams } from './diagrams';

const section: Section = {
  id: 'flujos',
  group: 'recorrido',
  title: 'Flujos',
  headline:
    'Cinco recorridos explican el funcionamiento: ingresar, ver, subir, anotar e intercambiar.',
  minutes: 3.5,
  tabs: [
    {
      id: 'ver-imagen',
      label: 'Ver una imagen',
      blocks: [
        { kind: 'diagram', id: 'tesela' },
        { kind: 'live', id: 'tile-mode' },
        {
          kind: 'callout',
          tone: 'warning',
          title: 'Variante de desarrollo (compose.dev-sin-login.yaml)',
          text: 'Reemplaza la consulta de acceso por una clave fija: toda imagen, exista o no, apunta al mismo archivo. Solo para desarrollo; no es el sistema que describe el diagrama.',
        },
      ],
    },
    {
      id: 'ingreso',
      label: 'Ingreso',
      blocks: [{ kind: 'diagram', id: 'login' }],
    },
    {
      id: 'subir',
      label: 'Subir',
      blocks: [
        { kind: 'diagram', id: 'subida' },
        {
          kind: 'callout',
          tone: 'honest',
          title: 'Lo que hace hoy y lo que propone el ADR-17',
          text: 'Hoy la interfaz sube un archivo por vez, sin reintento automático. La API puede sobrescribir un archivo huérfano con la misma clave y, si se corta la copia de un archivo, puede quedar uno parcial en el volumen. El tiempo de espera de la pasarela es de 300 s; el ADR-17 estima que un archivo de 6 a 10 GB necesita más y propone 1800 s. El ADR-17 (PROPUESTO) cambia esas partes; todavía no están construidas.',
        },
      ],
    },
    {
      id: 'anotar',
      label: 'Anotar',
      blocks: [
        { kind: 'diagram', id: 'anotar' },
        {
          kind: 'callout',
          tone: 'honest',
          title: 'El servidor está completo; falta el editor',
          text: 'La API valida y guarda anotaciones con autor y versión. Lo que no existe es el editor en la interfaz: hoy no se puede anotar desde el navegador. El reparto del editor (ADR-08) sigue propuesto.',
        },
      ],
    },
    {
      id: 'importar-exportar',
      label: 'Importar y exportar',
      blocks: [
        { kind: 'diagram', id: 'import-export' },
        {
          kind: 'callout',
          tone: 'info',
          text: 'La API importa solo el formato CRIC y exporta JSON interno y COCO; YOLO responde 422. Las pantallas de importación y exportación no existen: hoy se usan solo por la API.',
        },
      ],
    },
  ],
  notes: [
    'Cada tesela le pide permiso a la API antes de servirse.',
    'Mostrar el indicador en vivo; si dice variante de desarrollo, explicar el recuadro.',
    'Anotar: el servidor está completo; lo que falta es el editor en la interfaz.',
    'Subir: lo que hace hoy y lo que propone el ADR-17, que no está construido.',
  ],
  detail: [{ kind: 'diagram', id: 'sesion-spa' }],
};

export const content: StopContent = { section, diagrams, tables: [] };
