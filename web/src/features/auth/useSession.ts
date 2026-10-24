import { useCallback, useEffect, useState } from 'react';
import { type CurrentUser, fetchCurrentUser, logout } from './authApi';

export type Session =
  | { kind: 'checking' }
  | { kind: 'anonymous' }
  | { kind: 'authenticated'; user: CurrentUser }
  /** `/auth/me` could not be answered (gateway or API down): neither logged in nor out. */
  | { kind: 'unavailable' };

export interface SessionControls {
  session: Session;
  /** Called by the login screen once `/auth/me` confirmed the new session. */
  signedIn: (user: CurrentUser) => void;
  signOut: () => Promise<void>;
  retry: () => void;
}

/**
 * Session state of the SPA. On load it asks `GET /api/v1/auth/me`; the cookie is HttpOnly, so
 * that endpoint is the only way JavaScript learns whether there is a session (arquitectura §6.1).
 */
export function useSession(): SessionControls {
  const [session, setSession] = useState<Session>({ kind: 'checking' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchCurrentUser(controller.signal).then(
      (user) => {
        setSession(user ? { kind: 'authenticated', user } : { kind: 'anonymous' });
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        console.error('No se pudo consultar la sesión', error);
        setSession({ kind: 'unavailable' });
      },
    );
    return () => {
      controller.abort();
    };
  }, [attempt]);

  const signedIn = useCallback((user: CurrentUser) => {
    setSession({ kind: 'authenticated', user });
  }, []);

  const signOut = useCallback(async () => {
    await logout();
    setSession({ kind: 'anonymous' });
  }, []);

  const retry = useCallback(() => {
    setSession({ kind: 'checking' });
    setAttempt((value) => value + 1);
  }, []);

  return { session, signedIn, signOut, retry };
}
