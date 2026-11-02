/** The two error messages the members screen can show about a failed action. */
export interface MembersErrors {
  /** A failed role change or removal: shown above the members table. */
  action: string | null;
  /** A failed "Agregar": shown under the add form. */
  add: string | null;
}

export const NO_MEMBERS_ERRORS: MembersErrors = { action: null, add: null };

export type MembersErrorsEvent =
  /** An add, a role change or a removal begins: whatever failed before is no longer news. */
  | { type: 'action-started' }
  /** A role change or a removal failed. */
  | { type: 'action-failed'; message: string }
  /** An add failed. */
  | { type: 'add-failed'; message: string }
  /** The person is correcting the username of the add form. */
  | { type: 'username-edited' };

/** Reducer of the errors shown by the members screen. Pure: it returns a new state or the same. */
export function membersErrorsReducer(
  state: MembersErrors,
  event: MembersErrorsEvent,
): MembersErrors {
  switch (event.type) {
    case 'action-started':
      return state.action === null && state.add === null ? state : NO_MEMBERS_ERRORS;
    case 'action-failed':
      return { ...state, action: event.message };
    case 'add-failed':
      return { ...state, add: event.message };
    case 'username-edited':
      return state.add === null ? state : { ...state, add: null };
  }
}
