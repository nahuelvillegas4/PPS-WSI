import { useState } from 'react';
import { PROJECT_ROLE_LABELS, type ProjectRole } from '../access/access';
import { type Member, PROJECT_ROLES } from './membersApi';

interface MembersTableProps {
  members: readonly Member[];
  /** User whose request is in flight: its row is locked. */
  pendingUserId: number | null;
  onChangeRole: (member: Member, role: ProjectRole) => void;
  onRemove: (member: Member) => void;
}

/** Members of the project: one row each, with a role select and a confirmed "Quitar". */
export function MembersTable({
  members,
  pendingUserId,
  onChangeRole,
  onRemove,
}: MembersTableProps) {
  const [confirmingUserId, setConfirmingUserId] = useState<number | null>(null);
  const sorted = members.toSorted((a, b) => a.username.localeCompare(b.username));

  return (
    <div className="members-table-wrap">
      <table className="members-table">
        <thead>
          <tr>
            <th scope="col">Usuario</th>
            <th scope="col">Rol en el proyecto</th>
            <th scope="col">
              <span className="members-sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((member) => {
            const locked = pendingUserId === member.userId;
            return (
              <tr key={member.userId} className={locked ? 'members-row-locked' : undefined}>
                <td>
                  {member.username}
                  {!member.isActive && <span className="members-inactive"> (inactivo)</span>}
                </td>
                <td>
                  <select
                    className="members-select"
                    aria-label={`Rol de ${member.username}`}
                    value={member.role}
                    disabled={pendingUserId !== null}
                    onChange={(event) => {
                      const next = PROJECT_ROLES.find((role) => role === event.target.value);
                      if (next) onChangeRole(member, next);
                    }}
                  >
                    {PROJECT_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {PROJECT_ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <div className="members-actions">
                    {confirmingUserId === member.userId ? (
                      <>
                        <span className="members-confirm-text">
                          ¿Quitar a {member.username} del proyecto?
                        </span>
                        <button
                          type="button"
                          className="members-danger"
                          disabled={pendingUserId !== null}
                          onClick={() => {
                            setConfirmingUserId(null);
                            onRemove(member);
                          }}
                        >
                          Sí, quitar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmingUserId(null);
                          }}
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={pendingUserId !== null}
                        onClick={() => {
                          setConfirmingUserId(member.userId);
                        }}
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
