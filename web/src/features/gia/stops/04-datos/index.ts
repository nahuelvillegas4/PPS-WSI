import { FACTS } from '../../model/facts';
import type { StopContent } from '../../model/types';
import { DIAGRAMS_DATOS } from './diagrams';
import { TABLES_DATOS } from './tables';

/** Stop 4: the persistence model as migrated, and the extensions that have no schedule. */
export const content: StopContent = {
  section: {
    id: 'datos',
    group: 'recorrido',
    title: 'Datos',
    headline: 'Ocho tablas; el modelo del ADR-07 ya está migrado entero.',
    minutes: 2,
    tabs: [
      {
        id: 'implementado',
        label: 'Implementado',
        blocks: [
          { kind: 'diagram', id: 'er-implementado' },
          {
            kind: 'callout',
            tone: 'info',
            title: 'Dos claves foráneas compuestas',
            text: 'La base garantiza que la clase de una anotación pertenece al dataset de su imagen: annotations referencia images(dataset_id, id) y label_classes(dataset_id, id) con el mismo dataset_id. Por eso annotations repite dataset_id a propósito (ADR-07).',
          },
          { kind: 'table', id: 'tablas' },
        ],
      },
      {
        id: 'objetivo',
        label: 'Objetivo',
        blocks: [
          {
            kind: 'callout',
            tone: 'info',
            text: 'El modelo que fija el ADR-07 ya está migrado completo. Lo que falta son extensiones que la arquitectura (sección 5.4) trata como fuera de alcance, con un lugar donde enchufarse; ninguna se construye en esta etapa.',
          },
          { kind: 'diagram', id: 'er-objetivo' },
          {
            kind: 'list',
            items: [
              'annotation_revisions: historial de cambios de cada anotación. Extensión prevista, fuera de alcance y sin cronograma; las columnas están sin decidir.',
              'Estado de revisión por imagen, para una cola de revisión. Extensión prevista, fuera de alcance y sin cronograma; la tabla y las columnas están sin decidir.',
              'users.session_version: SIN DECIDIR. El ADR-16 propone derivar el sello de sesión del hash de la contraseña o agregar esta columna; se decide al implementar.',
              'Valores nuevos que no piden migración: formato dicom en las imágenes y origen model en las anotaciones. Extensión prevista, fuera de alcance.',
              'El conjunto de anotaciones por usuario ya existe como consulta (filtro de autores); no hay tabla.',
            ],
          },
        ],
      },
    ],
    notes: [
      'El modelo del ADR-07 ya está migrado entero.',
      `Son ${FACTS.tables} tablas y ${FACTS.migrations} migraciones, del 17/10 al 01/11; la base garantiza que la clase pertenece al dataset de la imagen.`,
      'El objetivo agrega solo extensiones fuera de alcance y sin cronograma: historial de revisiones y estado de revisión por imagen; ninguna se construye en esta etapa.',
      'Los nombres únicos de dataset y de clase los valida la API, no la base.',
    ],
    detail: [
      { kind: 'table', id: 'integridad' },
      { kind: 'table', id: 'migraciones' },
    ],
  },
  diagrams: DIAGRAMS_DATOS,
  tables: TABLES_DATOS,
};
