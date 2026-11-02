import { describe, expect, it } from 'vitest';
import {
  PASSWORD_TOO_LONG_MESSAGE,
  PASSWORD_TOO_SHORT_MESSAGE,
  USERNAME_INVALID_MESSAGE,
  checkNewUser,
} from './usersValidation';

const VALID_USERNAME = 'ana.perez';
const VALID_PASSWORD = 'a-long-enough-password';

describe('checkNewUser: username', () => {
  it.each([
    ['ana', true],
    ['ana.perez-01_x', true],
    ['a'.repeat(64), true],
    // Surrounding spaces are trimmed on submit, so they do not make the name invalid.
    ['  ana  ', true],
    ['ab', false],
    ['a'.repeat(65), false],
    ['Ana', false],
    ['ANA', false],
    ['ana perez', false],
    ['ana@perez', false],
    ['aná', false],
    ['   ', false],
  ])('username %j is valid: %s', (username, valid) => {
    const check = checkNewUser(username, VALID_PASSWORD);
    expect(check.valid).toBe(valid);
    expect(check.usernameMessage).toBe(valid ? null : USERNAME_INVALID_MESSAGE);
    expect(check.passwordMessage).toBeNull();
  });
});

describe('checkNewUser: password', () => {
  it.each([
    [11, PASSWORD_TOO_SHORT_MESSAGE],
    [12, null],
    [256, null],
    [257, PASSWORD_TOO_LONG_MESSAGE],
  ])('a password of %i characters gives %j', (length, message) => {
    const check = checkNewUser(VALID_USERNAME, 'x'.repeat(length));
    expect(check.passwordMessage).toBe(message);
    expect(check.valid).toBe(message === null);
    expect(check.usernameMessage).toBeNull();
  });

  it('counts spaces as characters', () => {
    expect(checkNewUser(VALID_USERNAME, ' '.repeat(12)).valid).toBe(true);
  });
});

describe('checkNewUser: empty and combined', () => {
  it('shows no message on an untouched form, which is still invalid', () => {
    expect(checkNewUser('', '')).toEqual({
      usernameMessage: null,
      passwordMessage: null,
      valid: false,
    });
  });

  it('reports each field on its own and is valid only when both are', () => {
    expect(checkNewUser('AB', 'short')).toEqual({
      usernameMessage: USERNAME_INVALID_MESSAGE,
      passwordMessage: PASSWORD_TOO_SHORT_MESSAGE,
      valid: false,
    });
    expect(checkNewUser(VALID_USERNAME, 'short').valid).toBe(false);
    expect(checkNewUser('AB', VALID_PASSWORD).valid).toBe(false);
    expect(checkNewUser(VALID_USERNAME, VALID_PASSWORD)).toEqual({
      usernameMessage: null,
      passwordMessage: null,
      valid: true,
    });
  });

  it('clears the message as soon as the value becomes valid', () => {
    expect(checkNewUser('an', VALID_PASSWORD).usernameMessage).toBe(USERNAME_INVALID_MESSAGE);
    expect(checkNewUser('ana', VALID_PASSWORD).usernameMessage).toBeNull();
  });

  it('states the limits of the contract in the messages', () => {
    expect(USERNAME_INVALID_MESSAGE).toContain('entre 3 y 64');
    expect(PASSWORD_TOO_SHORT_MESSAGE).toBe('La contraseña debe tener al menos 12 caracteres.');
    expect(PASSWORD_TOO_LONG_MESSAGE).toContain('256');
  });
});
