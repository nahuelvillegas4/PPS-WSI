import { useEffect } from 'react';
import { LoginPage } from '../features/auth/LoginPage';
import type { CurrentUser } from '../features/auth/authApi';
import { useSession } from '../features/auth/useSession';
import { CatalogPage } from '../features/catalog/CatalogPage';
import { ProjectMembersPage } from '../features/members/ProjectMembersPage';
import { UsersPage } from '../features/users/UsersPage';
import { ViewerPage } from '../features/viewer/ViewerPage';
import { navigate, useRoute } from '../shared/router';

interface SignedInAppProps {
  user: CurrentUser;
  onSignOut: () => Promise<void>;
}

/** The screens, once there is a session. */
function SignedInApp({ user, onSignOut }: SignedInAppProps) {
  const route = useRoute();
  const isGlobalAdmin = user.role === 'admin';

  // The users screen is for the global admin; anyone else is sent back to the catalog. The API
  // refuses the calls anyway: this only keeps a dead screen from showing.
  const hidden = route.name === 'users' && !isGlobalAdmin;
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
