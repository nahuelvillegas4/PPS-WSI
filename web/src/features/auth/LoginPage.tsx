import { type SyntheticEvent, useState } from 'react';
import {
  type CurrentUser,
  fetchCurrentUser,
  login,
  loginErrorMessage,
  PASSWORD_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
} from './authApi';

interface LoginPageProps {
  onLoggedIn: (user: CurrentUser) => void;
}

/**
 * Login screen (Ã©pica E2, interfaz). It does not change the URL: after a successful login the
 * user lands on the same route they asked for, e.g. `/images/1` (arquitectura Â§6.1 and QS-7).
 */
export function LoginPage({ onLoggedIn }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = username.trim() !== '' && password !== '' && !submitting;

  async function submit(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await login(username.trim(), password);
      // The cookie is HttpOnly: confirm the session the way the rest of the SPA will see it.
      const user = await fetchCurrentUser();
      if (!user) {
        setError(
          'La API aceptÃ³ las credenciales pero el navegador no guardÃ³ la cookie de sesiÃ³n. ' +
            'RevisÃ¡ COOKIE_SECURE en el .env si entrÃ¡s por http.',
        );
        return;
      }
      onLoggedIn(user);
    } catch (caught) {
      setError(loginErrorMessage(caught));
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login">
      <form
        className="login-card"
        aria-labelledby="login-title"
        onSubmit={(event) => {
          void submit(event);
        }}
      >
        <h1 id="login-title">GIA Â· Ingreso</h1>
        <p className="login-subtitle">Plataforma de anotaciÃ³n de imÃ¡genes mÃ©dicas</p>

        <label>
          Usuario
          <input
            name="username"
            autoComplete="username"
            autoFocus
            required
            maxLength={USERNAME_MAX_LENGTH}
            value={username}
            disabled={submitting}
            onChange={(event) => {
              setUsername(event.target.value);
            }}
          />
        </label>

        <label>
          ContraseÃ±a
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={PASSWORD_MAX_LENGTH}
            value={password}
            disabled={submitting}
            onChange={(event) => {
              setPassword(event.target.value);
            }}
          />
        </label>

        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="primary" disabled={!canSubmit}>
          {submitting ? 'Ingresandoâ€¦' : 'Ingresar'}
        </button>
      </form>
    </main>
  );
}
