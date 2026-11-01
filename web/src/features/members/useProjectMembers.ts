import { useCallback, useEffect, useState } from 'react';
import { type User, fetchUsers } from '../users/usersApi';
import { type Member, fetchMembers, fetchProjectSummary } from './membersApi';
import { describeMembersError } from './membersErrorMessage';

/** A loaded value tagged with the project it belongs to, so a stale one is never shown. */
interface ForProject<T> {
  projectId: number;
  value: T;
}

export interface ProjectMembersData {
  /** Name of the project; `null` until loaded or when the project is not reachable. */
  projectName: string | null;
  /** Members; `null` while loading. */
  members: Member[] | null;
  /** All accounts (global admin only); `null` while loading or for everybody else. */
  users: User[] | null;
  /** Why the accounts could not be loaded. */
  usersError: string | null;
  /** The project or its members cannot be read: no access, no permission, not found, server down. */
  accessError: string | null;
  /** Applies a change the server already confirmed to the loaded members. */
  changeMembers: (update: (current: Member[]) => Member[]) => void;
}

/**
 * Loads what the members screen needs: the project name, its members and, for the global admin,
 * the accounts to choose from. Data is loaded once per project; the confirmed changes the screen
 * makes are applied locally through `changeMembers`.
 */
export function useProjectMembers(projectId: number, isGlobalAdmin: boolean): ProjectMembersData {
  const [project, setProject] = useState<ForProject<string> | null>(null);
  const [projectError, setProjectError] = useState<ForProject<string> | null>(null);
  const [members, setMembers] = useState<ForProject<Member[]> | null>(null);
  const [membersError, setMembersError] = useState<ForProject<string> | null>(null);
  const [users, setUsers] = useState<User[] | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchProjectSummary(projectId, controller.signal)
      .then((summary) => {
        setProject({ projectId, value: summary.name });
        setProjectError(null);
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        setProjectError({ projectId, value: describeMembersError(caught) });
      });
    return () => {
      controller.abort();
    };
  }, [projectId]);

  useEffect(() => {
    const controller = new AbortController();
    fetchMembers(projectId, controller.signal)
      .then((items) => {
        setMembers({ projectId, value: items });
        setMembersError(null);
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        setMembersError({ projectId, value: describeMembersError(caught) });
      });
    return () => {
      controller.abort();
    };
  }, [projectId]);

  useEffect(() => {
    if (!isGlobalAdmin) return;
    const controller = new AbortController();
    fetchUsers(controller.signal)
      .then((items) => {
        setUsers(items);
        setUsersError(null);
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        setUsersError(describeMembersError(caught));
      });
    return () => {
      controller.abort();
    };
  }, [isGlobalAdmin]);

  const changeMembers = useCallback(
    (update: (current: Member[]) => Member[]) => {
      setMembers((current) =>
        current?.projectId === projectId ? { projectId, value: update(current.value) } : current,
      );
    },
    [projectId],
  );

  const currentProject = project?.projectId === projectId ? project : null;
  const currentMembers = members?.projectId === projectId ? members : null;
  const currentProjectError = projectError?.projectId === projectId ? projectError : null;
  const currentMembersError = membersError?.projectId === projectId ? membersError : null;

  return {
    projectName: currentProject?.value ?? null,
    members: currentMembers?.value ?? null,
    users: isGlobalAdmin ? users : null,
    usersError: isGlobalAdmin ? usersError : null,
    accessError: currentProjectError?.value ?? currentMembersError?.value ?? null,
    changeMembers,
  };
}
