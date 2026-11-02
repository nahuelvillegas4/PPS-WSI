/** Diagram of the decisions stop: `cambio-alcance`. */
import { c, g } from '../../model/diagramKit';
import type { DiagramDef } from '../../model/types';

/**
 * The scope change as a line of states. The last two are planned: the written approval of the
 * supervision and the 1.0.0 tag. No state is called "approved", because nothing records it.
 *
 * Status classes go on the transition that reaches each state (`--> EnMain:::partial`): Mermaid
 * 11.17.2 ignores a standalone `Node:::class` line and the one after `state "..." as Node`, and
 * only applies the class written in a transition (checked in a browser render). `Propuesto` has
 * no mark: it is a step that happened, not something built.
 */
const source = `stateDiagram-v2
    direction LR
    state "Propuesto<br/>ADR-15 a 17 y contrato 0.2.0<br/>31/10/2026" as Propuesto
    state "${g('partial')} En main<br/>commits 7a11164..2584cfc<br/>01/11/2026" as EnMain
    state "${g('planned')} Aprobación escrita<br/>PENDIENTE" as Aprobacion
    state "${g('planned')} Contrato 1.0.0<br/>PENDIENTE" as Contrato
    [*] --> Propuesto
    Propuesto --> EnMain${c('partial')}
    EnMain --> Aprobacion${c('planned')}
    Aprobacion --> Contrato${c('planned')}
    note right of Propuesto : Pedido del profesor, 31/10/2026`;

export const cambioAlcance: DiagramDef = {
  id: 'cambio-alcance',
  kind: 'state',
  title: 'Cambio de alcance',
  summary:
    'Línea de estados del cambio de alcance: propuesto el 31/10/2026 con los ADR-15 a 17 y el contrato 0.2.0, ya en main desde el 01/11/2026, con la aprobación escrita de la supervisión y el contrato 1.0.0 pendientes.',
  source,
  usesStatus: true,
  sources: [
    {
      kind: 'adr',
      ref: 'docs/adr/0015-roles-por-proyecto-y-membresia.md:102-103',
      note: 'Plazo y contrapartida de esfuerzo',
    },
    {
      kind: 'contract',
      ref: 'contract/README.md:22',
      note: 'La 1.0.0 no se etiqueta sin la aprobación de la supervisión',
    },
    { kind: 'contract', ref: 'contract/CHANGELOG.md', note: 'Contrato 0.2.0 del 31/10/2026' },
    {
      kind: 'code',
      ref: 'api/src/Pps.Domain/Access/AccessPolicy.cs',
      note: 'Política de acceso por proyecto, ya en main',
    },
    { kind: 'git', ref: 'git:7a11164', note: 'Primer commit de código del cambio, 01/11/2026' },
    { kind: 'git', ref: 'git:2584cfc', note: 'Último commit del cambio, 01/11/2026' },
  ],
  priority: 'P0',
};

export const diagrams: readonly DiagramDef[] = [cambioAlcance];
