import { c, g } from '../../model/diagramKit';
import type { DiagramDef } from '../../model/types';

/**
 * G01: who builds what. Ownership is a text suffix in the group titles, never a colour; the
 * colour channel is reserved for status. The editor node reads its status from `FEATURES`.
 */
export const repartoPps: DiagramDef = {
  id: 'reparto-pps',
  kind: 'flowchart',
  title: 'Quién hace qué',
  summary:
    'Diagrama de flujo de izquierda a derecha con tres grupos. La PPS 1 (Gino Tombesi) tiene el visor y las teselas, la interfaz y las pantallas, y la pasarela con el despliegue. La PPS 2 (Nahuel Villegas) tiene la API y la autorización, la base de datos, el ciclo de vida de las anotaciones y la importación y exportación. El contrato es compartido. El editor en el navegador aparece punteado y sin dueño confirmado, unido al visor, a la interfaz y a las anotaciones.',
  caption:
    'Reparto según el documento de arquitectura. El reparto del editor es una propuesta (ADR-08) que la supervisión no respondió.',
  source: `flowchart LR
  subgraph P1["PPS 1 · Gino Tombesi"]
    V["${g('done')} Visor y teselas"]${c('done')}
    S["${g('partial')} SPA y pantallas"]${c('partial')}
    G["${g('partial')} Pasarela y despliegue"]${c('partial')}
  end
  subgraph CO["Compartido"]
    K["${g('done')} Contrato 0.2.0<br/>OpenAPI, matriz y casos"]${c('done')}
  end
  subgraph P2["PPS 2 · Nahuel Villegas"]
    A["${g('done')} API y autorización"]${c('done')}
    D["${g('done')} Base de datos"]${c('done')}
    N["${g('done')} Anotaciones<br/>(ciclo de vida)"]${c('done')}
    I["${g('done')} Importar y exportar"]${c('done')}
  end
  E["${g('editor')} Editor en el navegador"]${c('editor')}
  S -->|"HTTP y contrato"| A
  A --> D
  E -.->|"ADR-08 propuesto, S1 sin respuesta"| V
  E -.-> S
  E -.-> N`,
  usesStatus: true,
  sources: [
    { kind: 'doc', ref: 'docs/arquitectura/03-bloques-y-ejecucion.md:131-144' },
    { kind: 'adr', ref: 'docs/adr/0008-frontera-y-reparto-del-editor.md' },
    {
      kind: 'doc',
      ref: 'docs/arquitectura/07-pendientes.md:7',
      note: 'S1: reparto del editor',
    },
    { kind: 'contract', ref: 'contract/openapi/api.v1.yaml:4', note: 'Versión 0.2.0 del contrato' },
  ],
  priority: 'P1',
};
