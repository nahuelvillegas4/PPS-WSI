import { lazy, Suspense, useEffect } from 'react';
import { LoginPage } from '../features/auth/LoginPage';
import type { CurrentUser } from '../features/auth/authApi';
import { useSession } from '../features/auth/useSession';
import { CatalogPage } from '../features/catalog/CatalogPage';
import { ProjectMembersPage } from '../features/members/ProjectMembersPage';
import { UsersPage } from '../features/users/UsersPage';
import { ViewerPage } from '../features/viewer/ViewerPage';
import { assertNever } from '../shared/assertNever';
import { navigate, useRoute } from '../shared/router';

// The guide is the only screen with a heavy dependency (Mermaid), so it is its own chunk.
const GiaPage = lazy(() =>
  import('../features/gia/GiaPage').then((module) => ({ default: module.GiaPage })),
);

interface SignedInAppProps {
  user: CurrentUser;
  onSignOut: () => Promise<void>;
}

/** The screens, once there is a session. */
function SignedInApp({ user, onSignOut }: SignedInAppProps) {
  const route = useRoute();
  const isGlobalAdmin = user.role === 'admin';

  // The users screen and the guide are for the global admin; anyone else is sent back to the
  // catalog. The API refuses the users calls anyway: this only keeps a dead screen from showing.
  // The guide is a static page, so for it this is the whole gate (it is not a server check).
  const hidden = (route.name === 'users' || route.name === 'gia') && !isGlobalAdmin;
  useEffect(() => {
    if (hidden) navigate('/', { replace: true });
  }, [hidden]);

  const goToCatalog = () => {
    navigate('/');
  };

  switch (route.name) {
    case 'viewer':
      return <ViewerPage key={route.imageId} imageId={route.imageId} onBack={goToCatalog} />;
    case 'members':
      return (
        <ProjectMembersPage
          key={route.projectId}
          projectId={route.projectId}
          isGlobalAdmin={isGlobalAdmin}
          onBack={goToCatalog}
        />
      );
    case 'users':
      if (!isGlobalAdmin) return null;
      return <UsersPage onBack={goToCatalog} />;
    case 'gia':
      if (!isGlobalAdmin) return null;
      return (
        <Suspense fallback={<p className="app-status">Cargando la guía…</p>}>
          <GiaPage
            onBack={goToCatalog}
            onNavigate={(target) => {
              navigate(target === 'users' ? '/admin/users' : '/');
            }}
          />
        </Suspense>
      );
    case 'catalog':
      return (
        <CatalogPage
          user={user}
          onOpenImage={(imageId) => {
            navigate(`/images/${imageId}`);
          }}
          onOpenMembers={(projectId) => {
            navigate(`/projects/${projectId}/members`);
          }}
          onOpenUsers={() => {
            navigate('/admin/users');
          }}
          onSignOut={onSignOut}
        />
      );
    default:
      // A route without a case above stops compiling, instead of rendering a blank page.
      return assertNever(route);
  }
}

export function App() {
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

  return <SignedInApp user={session.user} onSignOut={signOut} />;
}
