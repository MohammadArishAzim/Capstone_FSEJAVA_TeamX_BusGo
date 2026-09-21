/**
 * Minimal shell so the Dev 6 pages can run standalone. Dev 1 owns the real app shell / Navbar and
 * routing; when it lands, mount these routes in it:
 *   /my-trips  -> <RequireAuth><MyTripsPage /></RequireAuth>
 * and mount <ConfirmBookingDialog /> from Dev 5's seat-selection page.
 */
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { RequireAuth } from './auth/RequireAuth';
import { MyTripsPage } from './features/my-trips/MyTripsPage';
import { DevBookingDialogPage } from './pages/DevBookingDialogPage';
import { LoginPage } from './pages/LoginPage';

export function App() {
  const { user, isLoggedIn, logout } = useAuth();

  return (
    <>
      <nav className="navbar navbar-expand bg-primary navbar-dark mb-4">
        <div className="container">
          <Link className="navbar-brand" to="/">
            BusGo
          </Link>
          <div className="navbar-nav me-auto">
            <Link className="nav-link" to="/my-trips">
              My Trips
            </Link>
          </div>
          {isLoggedIn ? (
            <div className="d-flex align-items-center gap-3 text-white">
              <span>{user?.name}</span>
              <button className="btn btn-outline-light btn-sm" onClick={logout}>
                Logout
              </button>
            </div>
          ) : (
            <Link className="btn btn-outline-light btn-sm" to="/login">
              Log in
            </Link>
          )}
        </div>
      </nav>

      <main className="container pb-5">
        <Routes>
          <Route path="/" element={<Navigate to="/my-trips" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/my-trips"
            element={
              <RequireAuth>
                <MyTripsPage />
              </RequireAuth>
            }
          />
          {import.meta.env.DEV && (
            <Route
              path="/dev/booking-dialog"
              element={
                <RequireAuth>
                  <DevBookingDialogPage />
                </RequireAuth>
              }
            />
          )}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
