import { type SyntheticEvent, useState } from 'react';
import { PROJECT_ROLE_LABELS, type ProjectRole } from '../access/access';
import type { User } from '../users/usersApi';
import { MEMBER_USERNAME_MAX_LENGTH, MEMBER_USERNAME_PATTERN, PROJECT_ROLES } from './membersApi';

interface AddMemberFormProps {
  isGlobalAdmin: boolean;
  /** Global admin: the accounts still assignable; `null` while they load. */
  candidates: readonly User[] | null;
  /** Global admin: why the accounts could not be loaded. */
  candidatesError: string | null;
  /** Why the last add failed; owned by the screen, which clears it on the next action. */
  error: string | null;
  /** Resolves `true` when the member was added (the form resets) and `false` when it was not. */
  onAdd: (username: string, role: ProjectRole) => Promise<boolean>;
  /** The person changed the username: the error about the previous one no longer applies. */
  onUsernameEdit: () => void;
}

const DEFAULT_ROLE: ProjectRole = 'viewer';

/**
 * "Agregar miembro": the global admin picks an account from a list; the project administrator
 * types the exact username, because there is no user search for them (the account must exist).
 */
export function AddMemberForm({
  isGlobalAdmin,
  candidates,
  candidatesError,
  error,
  onAdd,
  onUsernameEdit,
}: AddMemberFormProps) {
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<ProjectRole>(DEFAULT_ROLE);
  const [submitting, setSubmitting] = useState(false);

  const trimmed = username.trim();
  const valid = isGlobalAdmin ? trimmed !== '' : MEMBER_USERNAME_PATTERN.test(trimmed);
  const canSubmit = valid && !submitting;

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const added = await onAdd(trimmed, role);
      if (added) {
        setUsername('');
        setRole(DEFAULT_ROLE);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleUsernameChange(value: string): void {
    setUsername(value);
    onUsernameEdit();
  }

  return (
    <form
      className="members-add-form"
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
    >
      <div className="members-add-fields">
        {isGlobalAdmin ? (
          <label className="members-field">
            Usuario
            <select
              className="members-select"
              value={username}
              disabled={submitting || candidates === null}
              onChange={(e) => {
                handleUsernameChange(e.target.value);
              }}
            >
              <option value="">
                {candidates === null ? 'Cargando usuarios…' : 'Elegí un usuario…'}
              </option>
              {(candidates ?? []).map((candidate) => (
                <option key={candidate.id} value={candidate.username}>
                  {candidate.username}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="members-field">
            Nombre de usuario
            <input
              className="members-input"
              required
              maxLength={MEMBER_USERNAME_MAX_LENGTH}
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
              value={username}
              disabled={submitting}
              onChange={(e) => {
                handleUsernameChange(e.target.value);
              }}
            />
          </label>
        )}

        <label className="members-field">
          Rol
          <select
            className="members-select"
            value={role}
            disabled={submitting}
            onChange={(e) => {
              const next = PROJECT_ROLES.find((candidate) => candidate === e.target.value);
              if (next) setRole(next);
            }}
          >
            {PROJECT_ROLES.map((projectRole) => (
              <option key={projectRole} value={projectRole}>
                {PROJECT_ROLE_LABELS[projectRole]}
              </option>
            ))}
          </select>
        </label>

        <button type="submit" className="primary" disabled={!canSubmit}>
          {submitting ? 'Agregando…' : 'Agregar'}
        </button>
      </div>

      {isGlobalAdmin && candidates?.length === 0 && (
        <p className="members-hint">
          No hay usuarios disponibles para agregar. Las cuentas nuevas se crean en la pantalla de
          usuarios.
        </p>
      )}
      {!isGlobalAdmin && (
        <p className="members-hint">
          Escribí el nombre de usuario exacto. La cuenta tiene que existir: solo el administrador
          global crea cuentas.
        </p>
      )}
      {candidatesError && (
        <p className="members-error" role="alert">
          {candidatesError}
        </p>
      )}
      {error && (
        <p className="members-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
