import { useEffect, useState } from 'react';
import { CreateUserModal } from './CreateUserModal';
import { GLOBAL_ROLE_LABELS } from './globalRoleLabels';
import { type NewUser, type User, createUser, fetchUsers } from './usersApi';
import { describeUserError } from './usersErrorMessage';
import './UsersPage.css';

interface UsersPageProps {
  onBack: () => void;
}

type UsersState =
  { kind: 'loading' } | { kind: 'ready'; users: User[] } | { kind: 'error'; message: string };

/** Users screen (global admin): lists the accounts and creates new ones with a password. */
export function UsersPage({ onBack }: UsersPageProps) {
  const [state, setState] = useState<UsersState>({ kind: 'loading' });
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetchUsers(controller.signal)
      .then((users) => {
        setState({ kind: 'ready', users });
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        setState({ kind: 'error', message: describeUserError(caught) });
      });
    return () => {
      controller.abort();
    };
  }, []);

  async function handleCreate(input: NewUser): Promise<void> {
    const created = await createUser(input);
    setState((current) =>
      current.kind === 'ready' ? { kind: 'ready', users: [...current.users, created] } : current,
    );
  }

  return (
    <div className="users-screen">
      <header className="users-header">
        <button type="button" onClick={onBack}>
          ← Volver
        </button>
        <h1>Usuarios</h1>
        <button
          type="button"
          className="primary"
          onClick={() => {
            setShowCreate(true);
          }}
        >
          Nuevo usuario
        </button>
      </header>

      <main className="users-body">
        <section className="users-panel">
          {state.kind === 'loading' && <p className="users-status">Cargando usuarios…</p>}

          {state.kind === 'error' && (
            <p className="users-error" role="alert">
              {state.message}
            </p>
          )}

          {state.kind === 'ready' && state.users.length === 0 && (
            <p className="users-status">Todavía no hay usuarios.</p>
          )}

          {state.kind === 'ready' && state.users.length > 0 && (
            <div className="users-table-wrap">
              <table className="users-table">
                <thead>
                  <tr>
                    <th scope="col">Usuario</th>
                    <th scope="col">Rol global</th>
                    <th scope="col">Activo</th>
                  </tr>
                </thead>
                <tbody>
                  {state.users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.username}</td>
                      <td>{GLOBAL_ROLE_LABELS[user.role]}</td>
                      <td>{user.isActive ? 'Sí' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {showCreate && (
        <CreateUserModal
          onClose={() => {
            setShowCreate(false);
          }}
          onSubmit={handleCreate}
        />
      )}
    </div>
  );
}
