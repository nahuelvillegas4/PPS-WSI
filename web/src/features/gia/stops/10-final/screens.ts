/**
 * The screens of the SPA, built and proposed, as drawn in the `mapa-pantallas` diagram. Built
 * screens name the route and the feature folder they come from, so a test can compare them with
 * the code; proposed ones take their status from `FEATURES` (they are tripwires).
 */
import type { StatusRef } from '../../model/diagramKit';
import { FEATURES, type FeatureId } from '../../model/features';
import type { Route } from '../../../../shared/router';

export interface ScreenNode {
  /** Mermaid node id. */
  id: string;
  lines: readonly string[];
  ref: StatusRef;
  /** Route name in `parseRoute`; absent when the screen has no URL of its own (the login). */
  route?: Route['name'];
  /** Folder under `web/src/features/` that holds the screen. */
  folder?: string;
}

/** The label that marks a screen nobody has designed yet. */
const NO_DESIGN = 'PROPUESTA, sin diseño';

function proposed(id: string, feature: FeatureId): ScreenNode {
  return { id, lines: [FEATURES[feature].label, NO_DESIGN], ref: feature };
}

export const BUILT_SCREENS: readonly ScreenNode[] = [
  { id: 'LOGIN', lines: ['Ingreso'], ref: 'done', folder: 'auth' },
  {
    id: 'CAT',
    lines: ['Catálogo', 'sin pantalla de clases'],
    ref: 'partial',
    route: 'catalog',
    folder: 'catalog',
  },
  { id: 'VIEW', lines: ['Visor'], ref: 'done', route: 'viewer', folder: 'viewer' },
  {
    id: 'USERS',
    lines: ['Usuarios', 'administración global'],
    ref: 'done',
    route: 'users',
    folder: 'users',
  },
  {
    id: 'MEMB',
    lines: ['Miembros', 'del proyecto'],
    ref: 'done',
    route: 'members',
    folder: 'members',
  },
  {
    id: 'GUIDE',
    lines: ['Guía del sistema', 'se abre con la URL /gia'],
    ref: 'done',
    route: 'gia',
    folder: 'gia',
  },
];

export const PROPOSED_SCREENS: readonly ScreenNode[] = [
  proposed('EDIT', 'editor'),
  proposed('CLS', 'classesScreen'),
  proposed('IMP', 'importScreen'),
  proposed('EXP', 'exportScreen'),
];

/** The proposed screens besides the editor: what the headline of the stop calls "tres más". */
export const EXTRA_SCREEN_FEATURES: readonly FeatureId[] = [
  'classesScreen',
  'importScreen',
  'exportScreen',
];
