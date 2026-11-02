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
  headline: 'La API va adelantada al plan; la interfaz de anotación y el despliegue, por detrás.',
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
          text: `Arriba, el plan de la hoja de ruta v0.9; abajo, lo hecho según la fecha del commit que lo trajo a main. Las barras no son horas trabajadas. La API cerró el incremento I3 el 28/10/2026, unas cuatro semanas antes del fin previsto de ese incremento, y el editor de la SPA, que es el camino crítico, no empezó. La línea vertical marca la fecha actual del navegador; los datos son del ${SNAPSHOT.label}.`,
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
    'La API llegó a I3 antes de lo previsto; el editor es el camino crítico.',
    'Las fechas de git son una cota superior: la bitácora fecha jornadas y git fecha commits.',
    'Deuda y seguridad: se muestra lo pendiente tal cual está, con su evidencia.',
    'Próximo paso crítico: el editor de anotaciones en la web, sobre la API ya lista.',
  ],
};

export const content: StopContent = { section, diagrams, tables };
