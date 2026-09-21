import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

/** Sends anonymous visitors to /login, remembering where they were headed. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth();
  const location = useLocation();
  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ redirectTo: location.pathname + location.search }} />;
  }
  return children;
}
