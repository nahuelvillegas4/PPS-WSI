import { describe, expect, it } from 'vitest';
import {
  type MembersErrors,
  type MembersErrorsEvent,
  NO_MEMBERS_ERRORS,
  membersErrorsReducer,
} from './membersErrors';

function run(...events: MembersErrorsEvent[]): MembersErrors {
  return events.reduce(membersErrorsReducer, NO_MEMBERS_ERRORS);
}

describe('membersErrorsReducer', () => {
  it('shows a failed add under the form only', () => {
    expect(run({ type: 'add-failed', message: 'no existe' })).toEqual({
      action: null,
      add: 'no existe',
    });
  });

  it('shows a failed role change or removal above the table only', () => {
    expect(run({ type: 'action-failed', message: 'sin permiso' })).toEqual({
      action: 'sin permiso',
      add: null,
    });
  });

  it('clears the add error when a later role change or removal starts', () => {
    const afterSuccess = run(
      { type: 'add-failed', message: 'no existe' },
      { type: 'action-started' },
    );
    expect(afterSuccess).toEqual(NO_MEMBERS_ERRORS);
  });

  it('clears the action error when a later add starts', () => {
    const afterAdd = run(
      { type: 'action-failed', message: 'sin permiso' },
      { type: 'action-started' },
    );
    expect(afterAdd).toEqual(NO_MEMBERS_ERRORS);
  });

  it('replaces the previous error of the same kind with the new one', () => {
    expect(
      run(
        { type: 'add-failed', message: 'primero' },
        { type: 'action-started' },
        { type: 'add-failed', message: 'segundo' },
      ).add,
    ).toBe('segundo');
  });

  it('clears only the add error when the username is edited', () => {
    const state = run(
      { type: 'action-failed', message: 'sin permiso' },
      { type: 'add-failed', message: 'no existe' },
      { type: 'username-edited' },
    );
    expect(state).toEqual({ action: 'sin permiso', add: null });
  });

  it('returns the same state when there is nothing to clear', () => {
    const quiet = NO_MEMBERS_ERRORS;
    expect(membersErrorsReducer(quiet, { type: 'action-started' })).toBe(quiet);
    expect(membersErrorsReducer(quiet, { type: 'username-edited' })).toBe(quiet);
    const onlyAction: MembersErrors = { action: 'x', add: null };
    expect(membersErrorsReducer(onlyAction, { type: 'username-edited' })).toBe(onlyAction);
  });

  it('does not mutate the given state', () => {
    const state: MembersErrors = { action: 'a', add: 'b' };
    membersErrorsReducer(state, { type: 'action-started' });
    membersErrorsReducer(state, { type: 'username-edited' });
    expect(state).toEqual({ action: 'a', add: 'b' });
  });
});
