/**
 * Fixed copy of the decisions stop (design section 2, C1, O1, C7 and C8). The wording is part of
 * the agreement with the students: it is used verbatim, and `decisiones.test.ts` keeps its own
 * copy of the text to notice an edit.
 */

/** C1, the callout of the scope change (tone `honest`). */
export const C1 =
  'El ADR-15 (§Plazo y §Verificación) dice que la migración y la pantalla de usuarios no se integran sin aprobación escrita. El código ya está en main desde el 01/11/2026, integrado por decisión de los estudiantes para la demostración del 02/11, sin PR y antes de recibir esa aprobación. El ADR sigue PROPUESTO.';

/** Footnote of C1. */
export const C1_FOOTNOTE =
  'El texto del ADR-15 menciona la rama feat/roles-por-proyecto-y-subida: se fusionó por avance rápido en main y se borró.';

/** O1, the origin of the request: its own paragraph right under C1, so the two are read together. */
export const O1 =
  'Origen: el ADR-15 registra que el pedido de roles por proyecto fue del profesor el 31/10/2026, y la subida desde el navegador se incorporó tras la muestra con la supervisión del 27/10. Lo que no consta en el repositorio es la aprobación escrita ni la contrapartida de esfuerzo.';

/** C7, the state of the editor split. */
export const C7 =
  'Reparto del editor: opción A propuesta, sin aprobación de la supervisión; interfaz sin construir';

/** C8, the label of the architecture documents that wait for the supervision. */
export const C8 =
  'desactualizado: pendiente de actualizar cuando la supervisión apruebe (ADR-15:108-115)';
