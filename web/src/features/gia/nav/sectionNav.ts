/**
 * Keyboard map of the guide: which key means what, which events the handler must leave alone,
 * and where "next" and "previous" land. All pure, so it is tested without a browser.
 */

export type NavAction =
  'next' | 'prev' | 'first' | 'last' | 'fullscreen' | 'notes' | 'present' | 'help' | 'close';

/** Actions that move between stops. */
export type MoveAction = 'next' | 'prev' | 'first' | 'last';

/** PageUp and PageDown are what presentation clickers send. */
const KEY_ACTIONS: ReadonlyMap<string, NavAction> = new Map<string, NavAction>([
  ['ArrowRight', 'next'],
  ['PageDown', 'next'],
  ['j', 'next'],
  ['ArrowLeft', 'prev'],
  ['PageUp', 'prev'],
  ['k', 'prev'],
  ['Home', 'first'],
  ['End', 'last'],
  ['f', 'fullscreen'],
  ['n', 'notes'],
  ['p', 'present'],
  ['?', 'help'],
  ['Escape', 'close'],
]);

/** The action of a `KeyboardEvent.key`, or `null` when the key means nothing here. */
export function keyToAction(key: string): NavAction | null {
  const normalized = key.length === 1 ? key.toLowerCase() : key;
  return KEY_ACTIONS.get(normalized) ?? null;
}

/**
 * True for the shortcuts that are a single printable character (j, k, f, n, p, ?). WCAG 2.1.4
 * asks for a way to turn exactly these off; arrows, Page keys, Home, End and Escape are not
 * affected.
 */
export function isCharacterShortcut(key: string): boolean {
  return key.length === 1 && keyToAction(key) !== null;
}

export function isMoveAction(action: NavAction): action is MoveAction {
  return action === 'next' || action === 'prev' || action === 'first' || action === 'last';
}

/**
 * The stop an action lands on, clamped at the first and last one (no wrap-around). An unknown
 * `currentId` counts as "before the first stop". Returns `null` when there are no stops.
 */
export function resolveNavTarget(
  ids: readonly string[],
  currentId: string,
  action: MoveAction,
): string | null {
  const last = ids.length - 1;
  if (last < 0) return null;
  const index = ids.indexOf(currentId);
  switch (action) {
    case 'first':
      return ids[0] ?? null;
    case 'last':
      return ids[last] ?? null;
    case 'next':
      return ids[Math.min(index + 1, last)] ?? null;
    case 'prev':
      return ids[Math.max(index - 1, 0)] ?? null;
  }
}

/**
 * Like `resolveNavTarget`, but `null` when the move would stay on the current stop (already at
 * the first or last one). The caller then leaves the key alone, so PageDown, End and the like
 * keep their native scrolling at the ends.
 */
export function moveDestination(
  ids: readonly string[],
  currentId: string,
  action: MoveAction,
): string | null {
  const target = resolveNavTarget(ids, currentId, action);
  return target === currentId ? null : target;
}

export interface KeyModifiers {
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

/** What the handler needs to know about the element that received the key. */
export interface KeyTarget {
  tagName: string;
  isContentEditable: boolean;
  inTablist: boolean;
  inOpenDialog: boolean;
  /** A horizontally scrollable region, which uses the arrow keys and Home/End itself. */
  inScrollRegion: boolean;
}

const TEXT_TAGS: ReadonlySet<string> = new Set(['INPUT', 'TEXTAREA', 'SELECT']);
/** The keys a tab bar and a scrollable region use themselves; every other key still reaches us. */
const WIDGET_KEYS: ReadonlySet<string> = new Set(['ArrowLeft', 'ArrowRight', 'Home', 'End']);

/**
 * True when the global handler must not react: shortcuts of the browser (Ctrl, Alt, Meta), keys
 * typed into a field, the keys a tab bar or a scrollable table uses (arrows, Home, End), anything
 * while a dialog is open. The clicker keys (PageUp, PageDown) and the letters keep working from a
 * focused tab. Shift alone is allowed only for `?`, which is Shift+/ on most layouts.
 */
export function shouldIgnoreKey(
  key: string,
  modifiers: KeyModifiers,
  target: KeyTarget | null,
  dialogOpen: boolean,
): boolean {
  if (modifiers.ctrlKey || modifiers.altKey || modifiers.metaKey) return true;
  if (modifiers.shiftKey && key !== '?') return true;
  if (dialogOpen) return true;
  if (target === null) return false;
  if (target.inOpenDialog) return true;
  if (TEXT_TAGS.has(target.tagName.toUpperCase()) || target.isContentEditable) return true;
  return (target.inTablist || target.inScrollRegion) && WIDGET_KEYS.has(key);
}

/** Display text of the keys that have a symbol; other keys show as they are. */
const KEY_DISPLAY: Readonly<Record<string, string>> = {
  ArrowRight: '→',
  ArrowLeft: '←',
  PageDown: 'Av Pág',
  PageUp: 'Re Pág',
  Home: 'Inicio',
  End: 'Fin',
  Escape: 'Esc',
};

export function displayKey(key: string): string {
  return KEY_DISPLAY[key] ?? key;
}

export interface KeyHelpEntry {
  action: NavAction;
  /** `KeyboardEvent.key` values that trigger the action. */
  keys: readonly string[];
  label: string;
}

/** Content of the help dialog; a test checks that every listed key really triggers its action. */
export const KEY_HELP: readonly KeyHelpEntry[] = [
  { action: 'next', keys: ['ArrowRight', 'PageDown', 'j'], label: 'Parada siguiente' },
  { action: 'prev', keys: ['ArrowLeft', 'PageUp', 'k'], label: 'Parada anterior' },
  { action: 'first', keys: ['Home'], label: 'Primera parada' },
  { action: 'last', keys: ['End'], label: 'Última parada' },
  { action: 'fullscreen', keys: ['f'], label: 'Diagrama de la parada activa en pantalla completa' },
  { action: 'notes', keys: ['n'], label: 'Mostrar u ocultar las notas del orador' },
  { action: 'present', keys: ['p'], label: 'Entrar o salir del modo presentación' },
  { action: 'help', keys: ['?'], label: 'Mostrar esta ayuda' },
  { action: 'close', keys: ['Escape'], label: 'Cerrar la ayuda o salir de la presentación' },
];
