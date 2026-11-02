/**
 * The five questions the team needs the supervision to answer. The text is the agreed wording and
 * is shown verbatim; `refs` name the pending item, ADR or risk each one comes from, so a test can
 * check that they still exist in the documents.
 */
import { FEATURES } from '../../model/features';
import type { Status } from '../../model/status';

export interface Question {
  /** 1 to 5, the order of the talk. */
  n: number;
  /** Verbatim wording, including what the question blocks. */
  text: string;
  /** Codes such as `S2`, `ADR-08` or `R13` that the question comes from. */
  refs: readonly string[];
  /** Every question is waiting for an answer; the one about TLS follows its tripwire. */
  status: Status;
}

export const QUESTIONS: readonly Question[] = [
  {
    n: 1,
    text: 'Aprobación escrita del cambio de alcance (roles por proyecto y subida desde el navegador: ADR-15, 16 y 17) y qué alcance se retira como contrapartida de esfuerzo. Bloquea: contrato 1.0.0 y actualización de la documentación.',
    refs: ['ADR-15', 'ADR-16', 'ADR-17'],
    status: 'unknown',
  },
  {
    n: 2,
    text: 'Reparto del editor (ADR-08, S1): ¿lo construye la PPS 1 (opción A propuesta) o la PPS 2 (opción B)? Ambas PPS lo listan. Bloquea: el editor.',
    refs: ['ADR-08', 'S1'],
    status: 'unknown',
  },
  {
    n: 3,
    text: 'Servidor del laboratorio o VM (S2): fecha de acceso, sistema, recursos, ubicación de las imágenes, o aceptar una VM. Bloquea: despliegue y aceptación.',
    refs: ['S2', 'P18', 'R13'],
    status: 'unknown',
  },
  {
    n: 4,
    text: 'Acceso externo y TLS (S3): solo red del laboratorio o también desde afuera; certificado propio o proxy del laboratorio. Bloquea: configuración de cookies y pasarela.',
    refs: ['S3', 'P19'],
    status: FEATURES.tls.status,
  },
  {
    n: 5,
    text: 'Datos de aceptación (S4, S6): qué subconjunto de CRIC o CCEDD y qué WSI de prueba, con qué licencia. Bloquea: la demostración.',
    refs: ['S4', 'S6'],
    status: 'unknown',
  },
];
