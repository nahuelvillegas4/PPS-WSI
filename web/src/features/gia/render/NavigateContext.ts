import { createContext } from 'react';

export type LiveTarget = 'catalog' | 'users';

/**
 * How a "see it live" button leaves the guide. `GiaPage` provides the `onNavigate` it receives
 * from the app, so the block renderers never touch the router.
 */
export const NavigateContext = createContext<(target: LiveTarget) => void>(() => undefined);
