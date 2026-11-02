import { useSyncExternalStore } from 'react';

export type ColorScheme = 'light' | 'dark';

const QUERY = '(prefers-color-scheme: dark)';

export function currentColorScheme(): ColorScheme {
  return typeof window !== 'undefined' && window.matchMedia(QUERY).matches ? 'dark' : 'light';
}

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(QUERY);
  media.addEventListener('change', onChange);
  return () => {
    media.removeEventListener('change', onChange);
  };
}

/** The colour scheme of the OS, live: the diagrams re-render when it changes. */
export function useColorScheme(): ColorScheme {
  return useSyncExternalStore(subscribe, currentColorScheme, () => 'light');
}
