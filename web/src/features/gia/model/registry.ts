/**
 * Assembles the content of every stop and annex: ordered sections plus the diagrams and tables
 * they own, indexed by id. A duplicate id throws at import time, so it is caught by any test.
 */
import { content as a1 } from '../anexos/a1-api';
import { content as a2 } from '../anexos/a2-requisitos';
import { content as a3 } from '../anexos/a3-calidad';
import { content as a4 } from '../anexos/a4-metricas';
import { content as a5 } from '../anexos/a5-docs-desactualizadas';
import { content as a6 } from '../anexos/a6-glosario';
import { content as a7 } from '../anexos/a7-fuentes';
import { content as s01 } from '../stops/01-que-es';
import { content as s02 } from '../stops/02-arquitectura';
import { content as s03 } from '../stops/03-flujos';
import { content as s04 } from '../stops/04-datos';
import { content as s05 } from '../stops/05-permisos';
import { content as s06 } from '../stops/06-requisitos';
import { content as s07 } from '../stops/07-calidad';
import { content as s08 } from '../stops/08-decisiones';
import { content as s09 } from '../stops/09-avance';
import { content as s10 } from '../stops/10-final';
import { content as s11 } from '../stops/11-preguntas';
import type { DiagramDef, Section, StopContent, TableDef } from './types';

/** Walk-through stops first, in talk order, then the annexes. */
const MODULES: readonly StopContent[] = [
  s01,
  s02,
  s03,
  s04,
  s05,
  s06,
  s07,
  s08,
  s09,
  s10,
  s11,
  a1,
  a2,
  a3,
  a4,
  a5,
  a6,
  a7,
];

function indexById<T extends { id: string }>(
  items: readonly T[],
  what: string,
): ReadonlyMap<string, T> {
  const map = new Map<string, T>();
  for (const item of items) {
    if (map.has(item.id)) throw new Error(`Duplicate ${what} id in the guide: ${item.id}`);
    map.set(item.id, item);
  }
  return map;
}

export const SECTIONS: readonly Section[] = MODULES.map((module) => module.section);

export const DIAGRAMS: ReadonlyMap<string, DiagramDef> = indexById(
  MODULES.flatMap((module) => module.diagrams),
  'diagram',
);

export const TABLES: ReadonlyMap<string, TableDef> = indexById(
  MODULES.flatMap((module) => module.tables),
  'table',
);

// Validated here too so a duplicated section id also fails on import.
indexById(SECTIONS, 'section');
