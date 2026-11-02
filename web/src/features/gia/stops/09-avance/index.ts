import { g } from '../../model/diagramKit';
import { SNAPSHOT } from '../../model/status';
import type { Section, StopContent } from '../../model/types';
import { diagrams } from './diagrams';
import { tables } from './tables';

/** Next steps already planned in the repository (logbook, roadmap and the ADRs). */
export const NEXT_STEPS: readonly string[] = [
  `${g('editor')} Editor de anotaciones en el navegador (rectángulo, polígono y edición) sobre la API ya lista; después, las pantallas de importación, exportación y clases.`,
  'Día 11 de la bitácora de la PPS 2 (02/11): congelar y verificar la OpenAPI, manuales de despliegue, importación CRIC y exportación COCO, guion de aceptación en una instalación limpia y traspaso de conocimiento hacia la PPS 1.',
  'Respuesta de la supervisión: aprobación escrita del cambio de alcance, contrapartida de esfuerzo y reparto del editor (ver Preguntas).',
  'Diferidos de roles y subida (ADR-15, 16 y 17): validador de sesión, guarda Sec-Fetch-Site, endurecimiento del arranque, pruebas por HTTP, scripts de respaldo, las respuestas 429, 409 protected-user, 413 y 507, y la escritura .part sin sobrescribir.',
  `${g('ci')} Integración continua y prueba de humo del despliegue.`,
  'Con la aprobación: etiquetar el contrato 1.0.0, regenerar los tipos del cliente y actualizar los documentos de arquitectura (ver Documentos desactualizados).',
  'Cierre: despliegue en el servidor o la máquina virtual (a definir con la supervisión), manuales, informe final y backlog; I4 cierra el 03/12 y I5, el 16/12.',
];

const section: Section = {
  id: 'avance',
  group: 'recorrido',
  title: 'Avance',
  headline: 'La API tiene hecho el contenido de I3; el editor y el despliegue van por detrás.',
  minutes: 2,
  tabs: [
    {
      id: 'plan-hecho',
      label: 'Plan frente a lo hecho',
      blocks: [
        { kind: 'diagram', id: 'hoja-de-ruta' },
        {
          kind: 'callout',
          tone: 'info',
          title: 'Cómo leerlo',
          text: `Arriba, el plan de la hoja de ruta v0.9; abajo, lo hecho según la fecha de git. Las barras no son horas trabajadas. El contenido de I3 en la API (ciclo de vida de anotaciones, importación CRIC y exportación COCO) está en main desde el commit del 28/10/2026. El criterio de salida de I3, el guion de aceptación en una instalación limpia, figura como pendiente en la bitácora de la PPS 2 (Día 11). El editor de la SPA, que es el camino crítico, no empezó. La bitácora fecha esas mismas jornadas entre 0 y 5 días después que git; por ejemplo, la jornada del cierre de I3: 28/10 en git y 30/10 en la bitácora. La línea vertical marca la fecha actual del navegador; los datos son del ${SNAPSHOT.label}.`,
        },
      ],
    },
    {
      id: 'por-epica',
      label: 'Por épica',
      blocks: [{ kind: 'table', id: 'epicas' }],
    },
    {
      id: 'deuda-seguridad',
      label: 'Deuda y seguridad',
      blocks: [{ kind: 'table', id: 'deuda-seguridad' }],
    },
    {
      id: 'proximos-pasos',
      label: 'Próximos pasos',
      blocks: [{ kind: 'list', items: NEXT_STEPS }],
    },
  ],
  notes: [
    'El contenido de I3 de la API está hecho; el editor es el camino crítico.',
    'Las fechas son las de git; la bitácora de la PPS 2 fecha esas mismas jornadas entre 0 y 5 días después.',
    'Deuda y seguridad: se muestra lo pendiente tal cual está, con su evidencia.',
    'Próximo paso crítico: el editor de anotaciones en la web, sobre la API ya lista.',
  ],
};

export const content: StopContent = { section, diagrams, tables };
