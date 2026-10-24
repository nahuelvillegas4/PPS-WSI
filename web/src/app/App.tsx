import { useSyncExternalStore } from 'react';
import { LoginPage } from '../features/auth/LoginPage';
import { useSession } from '../features/auth/useSession';
import { CatalogPage } from '../features/catalog/CatalogPage';
import { ViewerPage } from '../features/viewer/ViewerPage';

function subscribe(onChange: () => void): () => void {
  window.addEventListener('popstate', onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
  };
}

function usePath(): string {
  return useSyncExternalStore(subscribe, () => window.location.pathname);
}

function navigate(path: string): void {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function App() {
  const path = usePath();
  const { session, signedIn, signOut, retry } = useSession();

  if (session.kind === 'checking') {
    return <p className="app-status">Verificando la sesión…</p>;
  }
  if (session.kind === 'unavailable') {
    return (
      <div className="app-status" role="alert">
        <p>No se pudo contactar al servidor para verificar la sesión.</p>
        <button type="button" onClick={retry}>
          Reintentar
        </button>
      </div>
    );
  }

  // Without a session only the login screen is shown; the URL is kept, so after logging in
  // the user lands where they were going (arquitectura §6.1, QS-7).
  if (session.kind === 'anonymous') {
    return <LoginPage onLoggedIn={signedIn} />;
  }

  const match = /^\/images\/([1-9]\d*)$/.exec(path);

  if (match?.[1]) {
    return (
      <ViewerPage
        key={match[1]}
        imageId={Number(match[1])}
        onBack={() => {
          navigate('/');
        }}
      />
    );
  }

  return (
    <CatalogPage
      user={session.user}
      onOpenImage={(imageId) => {
        navigate(`/images/${imageId}`);
      }}
      onSignOut={signOut}
    />
  );
}
