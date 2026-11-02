import { statusOf } from '../../model/diagramKit';
import type { Status } from '../../model/status';
import type { StepDef } from '../../model/types';

/**
 * Web status of "create project, dataset and classes": the first two have a screen, the classes do
 * not. It stays partial while the classes screen is a planned item and becomes done when built.
 */
function catalogWebStatus(): Status {
  return statusOf('classesScreen') === 'done' ? 'done' : 'partial';
}

/**
 * "El flujo completo": the seven steps of the product from sign-in to export, each with the state
 * of the server side (API or tile service) and of the web interface. The web state of the steps
 * that need a screen that does not exist yet is read from `FEATURES`, never typed.
 */
export function buildFlowSteps(): StepDef[] {
  return [
    {
      id: 'ingresar',
      title: 'Ingresar',
      api: 'done',
      web: 'done',
      note: 'Sesión por cookie; al ingresar se vuelve a la dirección pedida.',
    },
    {
      id: 'catalogo',
      title: 'Crear proyecto, dataset y clases',
      api: 'done',
      web: catalogWebStatus(),
      note: 'Proyecto y dataset desde la interfaz; las clases solo por la API.',
    },
    {
      id: 'imagenes',
      title: 'Registrar o subir imágenes',
      api: 'done',
      web: 'done',
      note: 'Registro por clave del volumen y subida desde el navegador.',
    },
    {
      id: 'visualizar',
      title: 'Visualizar',
      api: 'done',
      web: 'done',
      note: 'Imágenes convencionales y SVS, en teselas.',
    },
    {
      id: 'anotar',
      title: 'Anotar',
      api: 'done',
      web: statusOf('editor'),
      note: 'La API valida y guarda; la interfaz no tiene editor.',
    },
    {
      id: 'importar',
      title: 'Importar anotaciones CRIC',
      api: 'done',
      web: statusOf('importScreen'),
      note: 'Con vista previa y reporte por la API; sin pantalla.',
    },
    {
      id: 'exportar',
      title: 'Exportar JSON y COCO',
      api: 'done',
      web: statusOf('exportScreen'),
      note: 'Por la API; YOLO queda como extensión.',
    },
  ];
}
