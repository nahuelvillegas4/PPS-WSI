import { useMemo, useSyncExternalStore } from 'react';

/** Screens of the SPA, one per URL shape. */
export type Route =
  | { name: 'catalog'; projectId?: number; datasetId?: number }
  | { name: 'viewer'; imageId: number }
  | { name: 'members'; projectId: number }
  | { name: 'users' };

/** A positive integer id as it appears in a path segment; anything else is not a route. */
function parseId(segment: string | undefined): number | null {
  if (segment === undefined || !/^[1-9]\d*$/.test(segment)) return null;
  const id = Number(segment);
  return Number.isSafeInteger(id) ? id : null;
}

/**
 * Maps a location to a route. Total: whatever is not a known route shape (unknown paths, a
 * malformed id) falls back to the catalog. The query string is not used yet.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- `_search` is part of the pinned signature; no route reads the query yet
export function parseRoute(pathname: string, _search: string): Route {
  const segments = pathname.split('/').slice(1);

  if (segments.length === 2 && segments[0] === 'images') {
    const imageId = parseId(segments[1]);
    if (imageId !== null) return { name: 'viewer', imageId };
  }
  if (segments.length === 3 && segments[0] === 'projects' && segments[2] === 'members') {
    const projectId = parseId(segments[1]);
    if (projectId !== null) return { name: 'members', projectId };
  }
  if (segments.length === 2 && segments[0] === 'admin' && segments[1] === 'users') {
    return { name: 'users' };
  }
  return { name: 'catalog' };
}

/** Goes to `path` without reloading the page; `replace` swaps the current history entry. */
export function navigate(path: string, opts?: { replace?: boolean }): void {
  if (opts?.replace) {
    window.history.replaceState({}, '', path);
  } else {
    window.history.pushState({}, '', path);
  }
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('popstate', onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
  };
}

/** The snapshot is a string, not a Route: a new object on every read would render forever. */
function getLocationSnapshot(): string {
  return window.location.pathname + window.location.search;
}

/** The route of the current URL; re-renders on `navigate` and on the browser's back/forward. */
export function useRoute(): Route {
  const location = useSyncExternalStore(subscribe, getLocationSnapshot);
  return useMemo(() => {
    const queryStart = location.indexOf('?');
    return queryStart === -1
      ? parseRoute(location, '')
      : parseRoute(location.slice(0, queryStart), location.slice(queryStart));
  }, [location]);
}
