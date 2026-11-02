/**
 * Fixed copy of the decisions stop (design section 2, C1, O1, C7 and C8). The wording is part of
 * the agreement with the students: it is used verbatim, and `decisiones.test.ts` keeps its own
 * copy of the text to notice an edit.
 *
 * Two edits after the independent audit (odd/gia-auditoria.md): C1 no longer says who decided the
 * integration (the team's task log records one student, not both: C3) and says "sin revisión
 * cruzada" instead of only "sin PR"; O1 keeps apart what the ADR records and what the logbook
 * records (C4).
 */

/** C1, the callout of the scope change (tone `honest`). */
export const C1 =
  'El ADR-15 (§Plazo y §Verificación) dice que la migración y la pantalla de usuarios no se integran sin aprobación escrita. El código ya está en main desde el 01/11/2026, integrado para la demostración del 02/11, sin PR ni revisión cruzada y antes de recibir esa aprobación. El ADR sigue PROPUESTO.';

/** Footnote of C1. */
export const C1_FOOTNOTE =
  'El texto del ADR-15 menciona la rama feat/roles-por-proyecto-y-subida: se fusionó por avance rápido en main y se borró.';

/**
 * O1, the origin of the request: its own paragraph right under C1, so the two are read together.
 * Each source says its own thing: the ADR records the professor's request for roles per project
 * (31/10) and that the upload from the browser was also commissioned; the logbook of the PPS 2
 * (Día 7, 27/10) records that, after a show to the supervision, the direct upload of images was
 * added.
 */
export const O1 =
  'Origen: el ADR-15 registra que el profesor pidió los roles por proyecto el 31/10/2026 y que se encomendó también la subida desde el navegador (ADR-17). La bitácora de la PPS 2 (Día 7, 27/10) registra que, tras una muestra con la supervisión, se incorporó la subida directa de imágenes a un dataset. Lo que no consta en el repositorio es la aprobación escrita ni la contrapartida de esfuerzo.';

/**
 * What the two states of an ADR mean, from `docs/arquitectura/README.md` §0.1. Shown above the
 * quadrant so that a DECIDIDO chip is never read as an approval of the supervision.
 */
export const STATES_LEGEND =
  'DECIDIDO: lo acordaron los dos estudiantes entre sí y no altera alcance, reparto ni criterios de evaluación. PROPUESTO: recomendación del equipo que necesita validación de la supervisión. Ninguno de los dos estados es una aprobación de la supervisión.';

/** C7, the state of the editor split. */
export const C7 =
  'Reparto del editor: opción A propuesta, sin aprobación de la supervisión; interfaz sin construir';

/** C8, the label of the architecture documents that wait for the supervision. */
export const C8 =
  'desactualizado: pendiente de actualizar cuando la supervisión apruebe (ADR-15:108-115)';
