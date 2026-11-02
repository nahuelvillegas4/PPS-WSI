import { GLOBAL_ADMIN_OPERATIONS, PROJECT_PERMISSION_OPERATIONS } from '../../data/operations';
import type { Section, StopContent } from '../../model/types';
import { diagrams } from './diagrams';
import { tables } from './tables';

const section: Section = {
  id: 'arquitectura',
  group: 'recorrido',
  title: 'Arquitectura',
  headline: 'La pasarela como puerta de entrada, cuatro contenedores y un dueño para cada dato.',
  minutes: 2.5,
  tabs: [
    {
      id: 'contenedores',
      label: 'Contenedores',
      blocks: [
        { kind: 'diagram', id: 'contenedores' },
        {
          kind: 'callout',
          tone: 'warning',
          title: 'La carpeta de imágenes no es de solo lectura para la API',
          text: 'El volumen es de solo lectura para el servicio de teselas y de lectura y escritura para la API, que guarda las subidas desde el navegador. Los documentos de arquitectura todavía dicen solo lectura para ambos.',
        },
        { kind: 'table', id: 'contenedores' },
      ],
    },
    {
      id: 'contexto',
      label: 'Contexto',
      blocks: [{ kind: 'diagram', id: 'contexto' }],
    },
    {
      id: 'api',
      label: 'API por dentro',
      blocks: [
        { kind: 'diagram', id: 'api-interna' },
        {
          kind: 'callout',
          tone: 'info',
          title: 'Dónde se decide el acceso',
          text: `La decisión de proyecto vive en una función pura, AccessPolicy.Decide. El filtro corre antes de cada acción y falla cerrado; solo en las ${String(PROJECT_PERMISSION_OPERATIONS)} operaciones con permiso de proyecto consulta esa función. Las ${String(GLOBAL_ADMIN_OPERATIONS)} de administración global las decide el rol de la cookie, que no se revalida. La consulta de acceso de las teselas llama a la función a mano y el listado de proyectos filtra por membresía por su cuenta.`,
        },
      ],
    },
    {
      id: 'spa',
      label: 'SPA por dentro',
      blocks: [
        { kind: 'diagram', id: 'spa-interna' },
        {
          kind: 'callout',
          tone: 'honest',
          text: 'Reparto del editor: opción A propuesta, sin aprobación de la supervisión; interfaz sin construir',
        },
        { kind: 'table', id: 'pantallas' },
        { kind: 'liveLink', target: 'catalog', label: 'Ver en vivo: Catálogo' },
        { kind: 'liveLink', target: 'users', label: 'Ver en vivo: Usuarios' },
      ],
    },
  ],
  notes: [
    'La pasarela es la puerta de entrada y cada pieza tiene un dueño.',
    'La interfaz y el visor son de la PPS 1, la API y la base de la PPS 2, y el contrato es compartido. Hoy el compose publica además la API y la base; el plan es dejar solo la pasarela.',
    'Pestaña API: el filtro falla cerrado y consulta la función pura en las operaciones con permiso de proyecto; las de administración global las decide el rol de la cookie.',
    'Pestaña SPA: el editor es el hueco; el reparto sigue propuesto (ADR-08).',
  ],
};

export const content: StopContent = { section, diagrams, tables };
