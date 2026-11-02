/** Tables of the decisions stop: `adrs`, `tres-ejes` and `alcance-agregado`. */
import { ADR_EVIDENCE, ADRS, adrLabel } from '../../data/adrs';
import { FACTS } from '../../model/facts';
import { statusOf } from '../../model/diagramKit';
import { SNAPSHOT, STATUS_META, type Evidence } from '../../model/status';
import type { AdrRow, Cell, TableDef } from '../../model/types';
import { C7, C8 } from './copy';

/** The title with the part of the state line that the index does not fit in one word. */
export function adrTitleCell(row: AdrRow): string {
  return row.qualifier === undefined ? row.title : `${row.title} (${row.qualifier})`;
}

/** The 17 ADR rows. The decision comes from the index of `docs/adr/README.md`, not from the code. */
export function adrsTable(rows: readonly AdrRow[] = ADRS): TableDef {
  const evidence: Evidence[] = ADR_EVIDENCE.map(({ adr, kind, ref, note }) => ({
    kind,
    ref,
    note: `${adrLabel(adr)}: ${note ?? ''}`.trim(),
  }));
  return {
    id: 'adrs',
    title: `Las ${rows.length} decisiones de arquitectura`,
    caption: `La columna Decisión copia el índice de docs/adr/README.md, y los títulos también, salvo el del ADR-04, donde "autorizadas" reemplaza la palabra del índice. La columna En código es una verificación aparte, al ${SNAPSHOT.label}: una decisión propuesta puede estar construida y una decidida puede estar a medias.`,
    columns: [
      { key: 'adr', label: 'ADR' },
      { key: 'title', label: 'Título' },
      { key: 'decision', label: 'Decisión', filterable: true },
      { key: 'inCode', label: 'En código', filterable: true },
      { key: 'sentence', label: 'Una frase' },
      { key: 'pending', label: 'Pendiente' },
    ],
    rows: rows.map((row) => ({
      adr: adrLabel(row.n),
      title: adrTitleCell(row),
      decision: { decision: row.decision },
      inCode: { status: row.inCode },
      sentence: row.sentence,
      pending: row.pending ?? '',
    })),
    sources: [
      { kind: 'adr', ref: 'docs/adr/README.md', note: 'Índice de decisiones y su estado' },
      ...evidence,
    ],
  };
}

/** Code, decision and approval kept apart, plus the effort offset that the PDFs ask for. */
export function tresEjesTable(): TableDef {
  const editor = statusOf('editor');
  return {
    id: 'tres-ejes',
    title: 'Código, decisión y aprobación son tres cosas distintas',
    caption:
      'NO REGISTRADA quiere decir que el repositorio no tiene el registro de la aprobación escrita de la supervisión. Sobre el alcance nuevo, PPS 1 §10 dice que no se agregan requisitos obligatorios sin retirar otros; PPS 2 §9, que lo adicional se aborda después de probar y documentar el flujo central y que todo ajuste preserva una entrega independiente y útil.',
    columns: [
      { key: 'feature', label: 'Funcionalidad' },
      { key: 'code', label: 'Código' },
      { key: 'decision', label: 'Decisión (ADR)' },
      { key: 'approval', label: 'Aprobación de la supervisión' },
      { key: 'effort', label: 'Contrapartida de esfuerzo' },
    ],
    rows: [
      {
        feature:
          'Roles por proyecto, autorización por proyecto y subida desde el navegador (ADR-15, 16 y 17)',
        code: {
          status: 'partial',
          text: 'IMPLEMENTADO PARCIALMENTE en main (01/11/2026; 5 commits, de 7a11164 a 2584cfc)',
        },
        decision: { decision: 'PROPUESTO' },
        approval: { approval: 'NO_REGISTRADA' },
        effort: { approval: 'PENDIENTE' },
      },
      {
        feature: `ADR-08. ${C7}`,
        code: { status: editor, text: STATUS_META[editor].label },
        decision: { decision: 'PROPUESTO' },
        approval: { approval: 'NO_REGISTRADA' },
        effort: 'No aplica',
      },
      {
        feature: 'Contrato 0.2.0 (la versión 1.0.0 no se etiqueta sin aprobación escrita)',
        code: {
          status: 'partial',
          text: 'Escrito el 31/10/2026 y en main desde el 01/11/2026, junto con el código; la API aún no aplica todas sus respuestas',
        },
        decision: { decision: 'PROPUESTO' },
        approval: { approval: 'NO_REGISTRADA' },
        effort: 'Ver la primera fila',
      },
      {
        feature: `Documentos de arquitectura v0.9 (28/09/2026): ${C8}`,
        code: { status: 'planned', text: 'Actualización pendiente' },
        decision: { decision: 'PENDIENTE' },
        approval: { approval: 'NO_REGISTRADA' },
        effort: 'No aplica',
      },
    ],
    sources: [
      {
        kind: 'adr',
        ref: 'docs/adr/0015-roles-por-proyecto-y-membresia.md:102-117',
        note: 'Plazo, contrapartida de esfuerzo, documentos a actualizar y estado de implementación',
      },
      {
        kind: 'adr',
        ref: 'docs/adr/0008-frontera-y-reparto-del-editor.md',
        note: 'Reparto del editor: opción A propuesta',
      },
      {
        kind: 'contract',
        ref: 'contract/CHANGELOG.md',
        note: 'Estado de implementación del contrato 0.2.0',
      },
      {
        kind: 'code',
        ref: 'api/src/Pps.Domain/Access/AccessPolicy.cs',
        note: 'Autorización por proyecto en main',
      },
      { kind: 'git', ref: 'git:7a11164', note: 'Primer commit de código del cambio' },
      { kind: 'git', ref: 'git:2584cfc', note: 'Último commit del cambio' },
    ],
  };
}

/** Everything the team added beyond the two statements, with where each piece comes from. */
export function alcanceAgregadoTable(): TableDef {
  const rows: Record<string, Cell>[] = [
    {
      scope:
        'Roles por proyecto: rol global admin o user y membresías con la escalera viewer < annotator < project-admin',
      origin: 'Pedido del profesor, 31/10/2026 (contexto del ADR-15)',
      approval: { approval: 'NO_REGISTRADA' },
      friction:
        'PPS 1 §4 no exige gestión compleja de roles y PPS 2 §3.3 pide autenticación local básica. PPS 1 §10 dice que no se agregan requisitos obligatorios sin retirar otros; PPS 2 §9 deja lo adicional para después de probar y documentar el flujo central',
    },
    {
      scope: `Autorización única por proyecto: ${FACTS.operations} operaciones con rol mínimo, 404 a quien no es miembro, 403 por rol insuficiente y teselas por membresía`,
      origin: 'Decisión del ADR-16',
      approval: { approval: 'NO_REGISTRADA' },
      friction:
        'El mismo roce que los roles (PPS 1 §10 y PPS 2 §9). Falta el validador de sesión, la guarda Sec-Fetch-Site, el 429 al asignar miembros y protected-user',
    },
    {
      scope: 'Pantallas de usuarios (administración global) y de miembros de un proyecto',
      origin: 'Pedido del 31/10/2026',
      approval: { approval: 'NO_REGISTRADA' },
      friction: 'El pendiente S12 proponía altas de usuarios sin pantalla',
    },
    {
      scope: 'Subida de imágenes desde el navegador',
      origin:
        'Se encomendó la subida (ADR-15, motivo; bitácora de la PPS 2, Día 7, 27/10/2026). La cola de archivos, el progreso y la cancelación son diseño del equipo (ADR-17)',
      approval: { approval: 'NO_REGISTRADA' },
      friction:
        'PPS 2 §3.1 solo pide registrar imágenes disponibles en el servidor. Faltan el prefiltro, el archivo .part y la ubicación de Nginx de 1800 s',
    },
    {
      scope: 'Pasarela Nginx de origen único con auth_request sobre las teselas',
      origin: 'Decisiones de arquitectura ADR-01 y ADR-04',
      approval: { decision: 'DECIDIDO' },
      friction: 'Agregado de arquitectura, no pedido por los enunciados',
    },
    {
      scope: `Contrato como código: dos OpenAPI 3.1 (${FACTS.operations} y ${FACTS.tileOperations} operaciones), JSON Schema, casos numéricos y check_contract.py`,
      origin: 'Convenciones y contrato (ADR-05)',
      approval: { decision: 'DECIDIDO' },
      friction: 'PPS 2 §4 pedía solo documentar el contrato',
    },
    {
      scope: 'Concurrencia optimista (ETag e If-Match, 428 y 412) y borrado lógico',
      origin: 'Modelo de datos (ADR-07)',
      approval: { decision: 'PROPUESTO' },
      friction: 'No pedido',
    },
    {
      scope:
        'Límite de intentos de ingreso (429), errores RFC 9457 con traceId, X-Request-ID y chequeos de salud',
      origin: 'Línea base de la arquitectura',
      approval: { decision: 'DECIDIDO' },
      friction: 'No pedido',
    },
    {
      scope: 'dryRun de la importación, tabla de importaciones y procedencia de cada anotación',
      origin: 'Importación por adaptadores (ADR-09)',
      approval: { decision: 'PROPUESTO' },
      friction: 'No pedido',
    },
    {
      scope: 'Pruebas de rendimiento y de estrés de las teselas (QS-4)',
      origin: 'Escenarios de calidad',
      approval: 'No aplica',
      friction: 'No pedido',
    },
    {
      scope: 'Variante de desarrollo sin ingreso (compose.dev-sin-login.yaml)',
      origin: 'Etapa previa al ingreso',
      approval: 'No aplica',
      friction: 'Obsoleta: el ingreso ya existe',
    },
  ];
  return {
    id: 'alcance-agregado',
    title: 'Alcance que el equipo agregó más allá de los enunciados',
    caption:
      'Los cuatro primeros son el cambio de alcance: su aprobación no consta en el repositorio. En los demás, la columna muestra el estado del ADR: DECIDIDO quiere decir acordado entre los dos estudiantes, no validado por la supervisión.',
    columns: [
      { key: 'scope', label: 'Alcance' },
      { key: 'origin', label: 'Origen' },
      { key: 'approval', label: 'Aprobación o estado del ADR' },
      { key: 'friction', label: 'Roce con el enunciado' },
    ],
    rows,
    collapsible: true,
    sources: [
      {
        kind: 'adr',
        ref: 'docs/adr/0015-roles-por-proyecto-y-membresia.md:100-103',
        note: 'Motivo, impacto y contrapartida',
      },
      {
        kind: 'adr',
        ref: 'docs/adr/0016-autorizacion-por-proyecto-y-sesion.md',
        note: 'Autorización por proyecto',
      },
      {
        kind: 'adr',
        ref: 'docs/adr/0017-subida-de-imagenes-desde-el-navegador.md',
        note: 'Subida desde el navegador',
      },
      { kind: 'doc', ref: 'docs/BITACORA_PPS2.md:302', note: 'Origen de la subida de imágenes' },
      {
        kind: 'doc',
        ref: 'docs/arquitectura/07-pendientes.md:18',
        note: 'S12: altas de usuarios sin pantalla',
      },
      {
        kind: 'contract',
        ref: 'contract/CHANGELOG.md',
        note: 'Respuestas documentadas y aún sin aplicar',
      },
      { kind: 'config', ref: 'compose.dev-sin-login.yaml', note: 'Variante de desarrollo' },
    ],
  };
}

export const tables: readonly TableDef[] = [adrsTable(), tresEjesTable(), alcanceAgregadoTable()];
