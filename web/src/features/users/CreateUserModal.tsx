import { type SyntheticEvent, useState } from 'react';
import type { GlobalRole } from '../access/access';
import { GLOBAL_ROLE_LABELS } from './globalRoleLabels';
import {
  GLOBAL_ROLES,
  type NewUser,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_PATTERN,
} from './usersApi';
import { describeUserError } from './usersErrorMessage';
import './UsersPage.css';

interface CreateUserModalProps {
  onClose: () => void;
  onSubmit: (input: NewUser) => Promise<void>;
}

export function CreateUserModal({ onClose, onSubmit }: CreateUserModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<GlobalRole>('user');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedUsername = username.trim();
  const canSubmit =
    USERNAME_PATTERN.test(trimmedUsername) &&
    password.length >= PASSWORD_MIN_LENGTH &&
    password.length <= PASSWORD_MAX_LENGTH &&
    !submitting;

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ username: trimmedUsername, password, role });
      onClose();
    } catch (caught: unknown) {
      setSubmitting(false);
      setError(describeUserError(caught));
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-user-title"
    >
      <div className="modal-content modal-content-sm">
        <header className="modal-header">
          <h2 id="create-user-title">Nuevo usuario</h2>
          <button type="button" className="close-button" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>

        <form
          className="create-user-form"
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          <label className="form-field">
            Nombre de usuario
            <input
              autoFocus
              required
              maxLength={USERNAME_MAX_LENGTH}
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
              value={username}
              disabled={submitting}
              onChange={(e) => {
                setUsername(e.target.value);
              }}
            />
            <small className="create-user-hint">
              De 3 a 64 caracteres: minúsculas, números, punto, guion y guion bajo.
            </small>
          </label>

          <label className="form-field">
            Contraseña
            <input
              required
              type="password"
              minLength={PASSWORD_MIN_LENGTH}
              maxLength={PASSWORD_MAX_LENGTH}
              autoComplete="new-password"
              value={password}
              disabled={submitting}
              onChange={(e) => {
                setPassword(e.target.value);
              }}
            />
            <small className="create-user-hint">Al menos {PASSWORD_MIN_LENGTH} caracteres.</small>
          </label>

          <label className="form-field">
            Rol global
            <select
              value={role}
              disabled={submitting}
              onChange={(e) => {
                const next = GLOBAL_ROLES.find((candidate) => candidate === e.target.value);
                if (next) setRole(next);
              }}
            >
              {GLOBAL_ROLES.map((globalRole) => (
                <option key={globalRole} value={globalRole}>
                  {GLOBAL_ROLE_LABELS[globalRole]}
                </option>
              ))}
            </select>
            <small className="create-user-hint">
              Un usuario solo ve los proyectos a los que lo asignes como miembro.
            </small>
          </label>

          {error && (
            <p className="modal-error" role="alert">
              {error}
            </p>
          )}

          <footer className="modal-footer">
            <button type="button" onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" className="primary" disabled={!canSubmit}>
              {submitting ? 'Guardando…' : 'Crear'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
