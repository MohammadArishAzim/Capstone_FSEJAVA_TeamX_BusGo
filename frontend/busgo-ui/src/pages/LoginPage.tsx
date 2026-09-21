/** TEMPORARY -- Dev 1 owns the real Login/Register pages. Minimal so Dev 6 work can be exercised. */
import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function LoginPage() {
  const { isLoggedIn, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { redirectTo?: string } | null)?.redirectTo ?? '/my-trips';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (isLoggedIn) return <Navigate to={redirectTo} replace />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card card-body mx-auto" style={{ maxWidth: 420 }}>
      <h2 className="h4 mb-3">Log in</h2>
      <form onSubmit={onSubmit} className="d-grid gap-3">
        <label className="form-label mb-0">
          Email
          <input className="form-control" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="form-label mb-0">
          Password
          <input className="form-control" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <div role="alert" className="alert alert-danger mb-0">{error}</div>}
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? 'Logging in...' : 'Log in'}
        </button>
      </form>
    </section>
  );
}
