import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, USERNAME_PATTERN } from './usersApi';

export const USERNAME_INVALID_MESSAGE =
  'El usuario debe tener entre 3 y 64 caracteres: minúsculas, números, punto, guion y guion bajo.';
export const PASSWORD_TOO_SHORT_MESSAGE = `La contraseña debe tener al menos ${String(PASSWORD_MIN_LENGTH)} caracteres.`;
export const PASSWORD_TOO_LONG_MESSAGE = `La contraseña no puede tener más de ${String(PASSWORD_MAX_LENGTH)} caracteres.`;

/** What the "Nuevo usuario" form shows about what the person typed so far. */
export interface NewUserCheck {
  /** Message under the username field; `null` while the field is empty or valid. */
  usernameMessage: string | null;
  /** Message under the password field; `null` while the field is empty or valid. */
  passwordMessage: string | null;
  /** Both fields satisfy `CreateUserRequest`: "Crear" may be enabled. */
  valid: boolean;
}

/** Why the username is not acceptable (surrounding spaces are ignored, as on submit). */
function usernameProblem(username: string): string | null {
  return USERNAME_PATTERN.test(username.trim()) ? null : USERNAME_INVALID_MESSAGE;
}

function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return PASSWORD_TOO_SHORT_MESSAGE;
  if (password.length > PASSWORD_MAX_LENGTH) return PASSWORD_TOO_LONG_MESSAGE;
  return null;
}

/**
 * Checks the fields of the create-user form against the limits of the contract. A message only
 * appears once the field has content, so an untouched form shows no errors yet stays invalid.
 */
export function checkNewUser(username: string, password: string): NewUserCheck {
  const usernameError = usernameProblem(username);
  const passwordError = passwordProblem(password);
  return {
    usernameMessage: username === '' ? null : usernameError,
    passwordMessage: password === '' ? null : passwordError,
    valid: usernameError === null && passwordError === null,
  };
}
