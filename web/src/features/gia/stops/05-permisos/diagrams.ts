import { PROJECT_ROLE_LABELS } from '../../../access/access';
import { GLOBAL_ROLE_LABELS } from '../../../users/globalRoleLabels';
import { c, g, statusOf, type StatusRef } from '../../model/diagramKit';
import { STATUS_META } from '../../model/status';
import type { DiagramDef } from '../../model/types';

const DONE = g('done');
const DONE_CLASS = c('done');

/** The word for a status, as the page prints it next to a planned item: `PLANIFICADO`. */
function tag(ref: StatusRef): string {
  return STATUS_META[statusOf(ref)].label.toUpperCase();
}

/** The role ladder, the global admin and what is reserved to it. */
const ROLES = `flowchart TB
  NM["${DONE} Usuario sin membresía<br/>no ve el proyecto (404)"]${DONE_CLASS}
  V["${DONE} ${PROJECT_ROLE_LABELS.viewer}<br/>ve el proyecto, sus datos<br/>y sus teselas"]${DONE_CLASS}
  A["${DONE} ${PROJECT_ROLE_LABELS.annotator}<br/>crea anotaciones<br/>y edita solo las propias"]${DONE_CLASS}
  P["${DONE} ${PROJECT_ROLE_LABELS['project-admin']}<br/>catálogo, subir imágenes,<br/>miembros y exportar"]${DONE_CLASS}
  G["${DONE} ${GLOBAL_ROLE_LABELS.admin}<br/>actúa como administrador<br/>del proyecto en todo proyecto"]${DONE_CLASS}
  X["${DONE} Reservado al administrador global<br/>usuarios · proyectos · volumen<br/>registrar por clave · importar"]${DONE_CLASS}
  NM -- "se le asigna un rol" --> V
  V -- "suma" --> A
  A -- "suma" --> P
  G -- "actúa como" --> P
  G -- "además" --> X`;

/**
 * `AccessPolicy.Decide` plus the author check, in the order the API applies them: session, the
 * resource exists, global admin, membership, minimum role, author. A missing resource and a
 * non-member both end in the same 404.
 */
const DECISION_ACCESO = `flowchart TD
  SV["${g('sessionValidator')} Validador de sesión<br/>${tag('sessionValidator')}, ADR-16"]${c('sessionValidator')}
  Q1{"${DONE} ¿Hay sesión válida?"}${DONE_CLASS}
  R1["${DONE} 401<br/>sin sesión válida"]${DONE_CLASS}
  Q2{"${DONE} ¿El recurso existe?"}${DONE_CLASS}
  R2["${DONE} 404<br/>no revela que existe"]${DONE_CLASS}
  Q3{"${DONE} ¿Es administrador global?"}${DONE_CLASS}
  Q4{"${DONE} ¿Es miembro del proyecto?"}${DONE_CLASS}
  Q5{"${DONE} ¿Su rol alcanza el mínimo<br/>del permiso?"}${DONE_CLASS}
  R3["${DONE} 403<br/>rol insuficiente"]${DONE_CLASS}
  Q6{"${DONE} ¿Edita o borra<br/>una anotación?"}${DONE_CLASS}
  Q7{"${DONE} ¿Es su autor?"}${DONE_CLASS}
  R4["${DONE} 403<br/>solo el autor puede"]${DONE_CLASS}
  OK["${DONE} Permitido"]${DONE_CLASS}
  SV -.-> Q1
  Q1 -- "no" --> R1
  Q1 -- "sí" --> Q2
  Q2 -- "no" --> R2
  Q2 -- "sí" --> Q3
  Q3 -- "sí: actúa como<br/>administrador del proyecto" --> Q6
  Q3 -- "no" --> Q4
  Q4 -- "no" --> R2
  Q4 -- "sí" --> Q5
  Q5 -- "no" --> R3
  Q5 -- "sí" --> Q6
  Q6 -- "no" --> OK
  Q6 -- "sí" --> Q7
  Q7 -- "sí" --> OK
  Q7 -- "no" --> R4`;

export const DIAGRAMS_PERMISOS: readonly DiagramDef[] = [
  {
    id: 'roles',
    kind: 'flowchart',
    title: 'Roles',
    summary:
      'Escalera de tres roles de proyecto en la que cada uno suma permisos al anterior, el administrador global que actúa como administrador de todo proyecto, y lo que solo él puede hacer.',
    source: ROLES,
    usesStatus: true,
    sources: [
      { kind: 'code', ref: 'api/src/Pps.Domain/Access/Permission.cs' },
      { kind: 'code', ref: 'api/src/Pps.Domain/Access/ProjectRole.cs' },
      { kind: 'contract', ref: 'contract/fixtures/authorization-matrix.json' },
      { kind: 'adr', ref: 'docs/adr/0015-roles-por-proyecto-y-membresia.md' },
    ],
    priority: 'P1',
  },
  {
    id: 'decision-acceso',
    kind: 'flowchart',
    title: 'Cómo decide la API',
    summary:
      'Árbol de decisión de la API ante un pedido sobre un recurso de un proyecto: sesión, existencia del recurso, administrador global, membresía, rol mínimo y autoría, con los resultados 401, 404, 403 o permitido.',
    caption:
      'Falla cerrado: un endpoint sin exactamente una declaración de acceso se deniega con 403. La política es una función pura, la misma en la API y en la consulta de acceso de las teselas.',
    source: DECISION_ACCESO,
    usesStatus: true,
    sources: [
      { kind: 'code', ref: 'api/src/Pps.Domain/Access/AccessPolicy.cs:28-49' },
      { kind: 'code', ref: 'api/src/Pps.Api/Common/Access/AccessGuardFilter.cs:41-48' },
      { kind: 'code', ref: 'api/src/Pps.Api/Common/Access/AccessGate.cs' },
      { kind: 'code', ref: 'api/src/Pps.Api/Controllers/Annotations/AnnotationsController.cs:246' },
      { kind: 'adr', ref: 'docs/adr/0016-autorizacion-por-proyecto-y-sesion.md' },
    ],
    priority: 'P0',
  },
];
