/** Fixed Spanish copy that the shell owns (C2 and C11 of the design), used verbatim. */
/** C2: what the access check does and does not mean. Tooltip of the date badge in the header. */
export const ACCESS_NOTICE =
  'Visible solo para una sesión con rol administrador global. El contenido no es secreto y la restricción es de la interfaz, no del servidor.';

/** C11 ends with a link to the sources annex; this is its text. */
export const FOOTER_LINK_TEXT = 'Fuentes y método';

/** The shape of `SNAPSHOT` from `model/status` (its literal types are not needed here). */
interface Snapshot {
  commit: string;
  label: string;
}

/** C11 up to the link: "Datos al 02/11/2026 · commit 2584cfc · confeccionado a mano; ver ". */
export function footerLead(snapshot: Snapshot): string {
  return `Datos al ${snapshot.label} · commit ${snapshot.commit} · confeccionado a mano; ver `;
}

/** The header badge text. */
export function snapshotBadge(snapshot: Snapshot): string {
  return `Datos al ${snapshot.label}`;
}

/** Banner shown when the snapshot is older than the staleness threshold. */
export function staleMessage(snapshot: Snapshot, ageDays: number): string {
  return `Los datos de esta guía se tomaron el ${snapshot.label} (hace ${String(ageDays)} días). Conviene verificarlos contra el repositorio antes de presentarla.`;
}
