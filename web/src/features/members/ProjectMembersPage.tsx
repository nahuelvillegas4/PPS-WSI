import { useMemo, useState } from 'react';
import type { ProjectRole } from '../access/access';
import { AddMemberForm } from './AddMemberForm';
import { assignableUsers, upsertMember, withoutMember } from './memberList';
import { type Member, addMember, removeMember, updateMemberRole } from './membersApi';
import { describeMembersError } from './membersErrorMessage';
import { MembersTable } from './MembersTable';
import { useProjectMembers } from './useProjectMembers';
import './ProjectMembersPage.css';

interface ProjectMembersPageProps {
  projectId: number;
  isGlobalAdmin: boolean;
  onBack: () => void;
}

/** Members screen of a project: who has access and with which role. */
export function ProjectMembersPage({ projectId, isGlobalAdmin, onBack }: ProjectMembersPageProps) {
  const { projectName, members, users, usersError, accessError, changeMembers } = useProjectMembers(
    projectId,
    isGlobalAdmin,
  );
  const [pendingUserId, setPendingUserId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const candidates = useMemo(
    () => (users && members ? assignableUsers(users, members) : null),
    [users, members],
  );

  /** Runs a change on one member: locks its row meanwhile and shows the error if it fails. */
  async function runOnMember(userId: number, change: () => Promise<void>): Promise<void> {
    setPendingUserId(userId);
    setActionError(null);
    try {
      await change();
    } catch (caught: unknown) {
      setActionError(describeMembersError(caught));
    } finally {
      setPendingUserId(null);
    }
  }

  async function handleChangeRole(member: Member, role: ProjectRole): Promise<void> {
    if (role === member.role) return;
    await runOnMember(member.userId, async () => {
      const updated = await updateMemberRole(projectId, member.userId, role);
      changeMembers((current) => upsertMember(current, updated));
    });
  }

  async function handleRemove(member: Member): Promise<void> {
    await runOnMember(member.userId, async () => {
      await removeMember(projectId, member.userId);
      changeMembers((current) => withoutMember(current, member.userId));
    });
  }

  /** Throws when the API refuses, so the form can show why. */
  async function handleAdd(username: string, role: ProjectRole): Promise<void> {
    setActionError(null);
    const added = await addMember(projectId, { username, role });
    changeMembers((current) => upsertMember(current, added));
  }

  return (
    <div className="members-screen">
      <header className="members-header">
        <button type="button" onClick={onBack}>
          ← Volver
        </button>
        <div className="members-heading">
          <h1>Miembros del proyecto</h1>
          {projectName && <span className="members-project">{projectName}</span>}
        </div>
      </header>

      <main className="members-body">
        {accessError ? (
          <p className="members-notice" role="alert">
            {accessError}
          </p>
        ) : (
          <>
            <section className="members-panel">
              <h2>Miembros</h2>
              {actionError && (
                <p className="members-error" role="alert">
                  {actionError}
                </p>
              )}
              {members === null && <p className="members-status">Cargando miembros…</p>}
              {members?.length === 0 && (
                <p className="members-status">Este proyecto todavía no tiene miembros asignados.</p>
              )}
              {members !== null && members.length > 0 && (
                <MembersTable
                  members={members}
                  pendingUserId={pendingUserId}
                  onChangeRole={(member, role) => {
                    void handleChangeRole(member, role);
                  }}
                  onRemove={(member) => {
                    void handleRemove(member);
                  }}
                />
              )}
            </section>

            <section className="members-panel">
              <h2>Agregar miembro</h2>
              <AddMemberForm
                isGlobalAdmin={isGlobalAdmin}
                candidates={candidates}
                candidatesError={usersError}
                onAdd={handleAdd}
              />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
