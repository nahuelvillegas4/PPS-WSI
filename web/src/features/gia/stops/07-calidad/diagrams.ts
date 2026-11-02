import { c, g } from '../../model/diagramKit';
import { FACTS } from '../../model/facts';
import type { DiagramDef } from '../../model/types';

/**
 * G16: what verifies the contract today. The matrix of authorization is the single source of
 * three verifiers; the verifier script does not run in any continuous integration, which the
 * `ci` entry of `model/features.ts` guards (its tripwire fails when someone adds a workflow).
 * The planned HTTP script is guarded by `quality.test.ts`, which fails when the file appears.
 */
export const contratoVerificacion: DiagramDef = {
  id: 'contrato-verificacion',
  kind: 'flowchart',
  title: 'Qué verifica el contrato',
  summary:
    'Diagrama de flujo de izquierda a derecha. El contrato (OpenAPI, esquemas JSON, casos numéricos y matriz de autorización) alimenta a cuatro verificadores que existen hoy: el script del contrato, xUnit, Vitest y pytest. Tres verificadores usan la matriz. Cuatro piezas planificadas aparecen punteadas: integración continua, una prueba de la matriz por HTTP, la comparación de la OpenAPI generada y los tipos TypeScript generados.',
  caption:
    'Los archivos del contrato son la fuente única; cada verificador lee solo los que le corresponden.',
  source: `flowchart LR
  subgraph CT["Contrato"]
    OA["${g('done')} OpenAPI<br/>API: ${FACTS.operations}, teselas: ${FACTS.tileOperations}"]${c('done')}
    ES["${g('done')} Esquemas JSON<br/>(2)"]${c('done')}
    CN["${g('done')} Casos numéricos<br/>(4 fixtures)"]${c('done')}
    MA["${g('done')} Matriz de autorización<br/>(${FACTS.operations} filas)"]${c('done')}
  end
  subgraph VF["Verificadores que existen hoy"]
    CC["${g('done')} check_contract.py<br/>no corre en ninguna CI"]${c('done')}
    XU["${g('done')} xUnit (API)"]${c('done')}
    VT["${g('done')} Vitest (web)"]${c('done')}
    PT["${g('done')} pytest (teselas)"]${c('done')}
  end
  subgraph PL["Planificado"]
    CI["${g('ci')} Integración continua"]${c('ci')}
    HT["${g('planned')} test_authz_matrix.py<br/>(por HTTP)"]${c('planned')}
    GO["${g('planned')} Comparar la OpenAPI<br/>generada con el contrato"]${c('planned')}
    TS["${g('planned')} Tipos TypeScript<br/>generados"]${c('planned')}
  end
  MA --> XU
  MA --> VT
  MA --> CC
  CN --> XU
  CN --> VT
  CN --> PT
  CN --> CC
  ES --> XU
  ES --> CC
  OA -->|"solo valida"| CC
  CI -.-> CC
  HT -.-> MA
  GO -.-> OA
  TS -.-> OA`,
  usesStatus: true,
  sources: [
    { kind: 'contract', ref: 'contract/README.md' },
    { kind: 'code', ref: 'scripts/check_contract.py' },
    { kind: 'contract', ref: 'contract/fixtures/authorization-matrix.json' },
    {
      kind: 'adr',
      ref: 'docs/adr/0016-autorizacion-por-proyecto-y-sesion.md:89-92',
      note: 'Quién consume la matriz y la prueba por HTTP prevista',
    },
  ],
  priority: 'P1',
};
