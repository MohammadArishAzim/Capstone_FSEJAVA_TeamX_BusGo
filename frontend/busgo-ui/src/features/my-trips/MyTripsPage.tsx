import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cancelBooking, fetchMyBookings } from '../../api/bookings';
import { ApiRequestError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import type { Booking } from '../../types/booking';
import { formatFare } from '../booking/format';

type Filter = 'ALL' | 'BOOKED' | 'CANCELLED';
type LoadState = 'loading' | 'ready' | 'error';

const FILTER_LABELS: Record<Filter, string> = { ALL: 'All', BOOKED: 'Active', CANCELLED: 'Cancelled' };

function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Spec: users "can cancel upcoming trips" -- so the action is offered for active, not-yet-departed trips. */
function canCancel(booking: Booking): boolean {
  return booking.status === 'BOOKED' && booking.journeyDate >= todayIso();
}

export function MyTripsPage() {
  const { logout } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [toCancel, setToCancel] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadState('loading');
    setLoadError(null);
    try {
      setBookings(await fetchMyBookings());
      setLoadState('ready');
    } catch (e) {
      if (e instanceof ApiRequestError && e.status === 401) {
        logout(); // expired/invalid token: RequireAuth then redirects to /login
        return;
      }
      setLoadError(e instanceof Error ? e.message : 'Could not load your trips.');
      setLoadState('error');
    }
  }, [logout]);

  useEffect(() => {
    // Initial fetch on mount; `load` drives the loading/ready/error state.
    void load();
  }, [load]);

  async function confirmCancel() {
    if (!toCancel) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const updated = await cancelBooking(toCancel.id);
      setBookings((list) => list.map((b) => (b.id === updated.id ? updated : b)));
      setNotice(`Booking #${updated.id} cancelled. Seats ${updated.seatNumbers.join(', ')} are now free.`);
      setToCancel(null);
    } catch (e) {
      if (e instanceof ApiRequestError && e.status === 401) {
        logout();
        return;
      }
      setCancelError(e instanceof Error ? e.message : 'Could not cancel this booking.');
      if (e instanceof ApiRequestError && e.status === 409) void load(); // already cancelled elsewhere
    } finally {
      setCancelling(false);
    }
  }

  const counts: Record<Filter, number> = {
    ALL: bookings.length,
    BOOKED: bookings.filter((b) => b.status === 'BOOKED').length,
    CANCELLED: bookings.filter((b) => b.status === 'CANCELLED').length,
  };
  const visible = filter === 'ALL' ? bookings : bookings.filter((b) => b.status === filter);

  return (
    <section>
      <h2 className="mb-3">My Trips</h2>

      {notice && (
        <div role="status" className="alert alert-success">
          {notice}
        </div>
      )}

      {loadState === 'loading' && <p>Loading your trips...</p>}

      {loadState === 'error' && (
        <div className="alert alert-danger d-flex justify-content-between align-items-center" role="alert">
          <span>{loadError}</span>
          <button className="btn btn-outline-danger btn-sm" onClick={() => void load()}>
            Try again
          </button>
        </div>
      )}

      {loadState === 'ready' && bookings.length === 0 && (
        <div className="card card-body text-center text-muted py-5">
          <p>You haven&apos;t booked any trips yet.</p>
          <Link className="btn btn-primary align-self-center" to="/">
            Search buses
          </Link>
        </div>
      )}

      {loadState === 'ready' && bookings.length > 0 && (
        <>
          <div className="nav nav-tabs mb-3" role="tablist" aria-label="Filter trips">
            {(Object.keys(FILTER_LABELS) as Filter[]).map((key) => (
              <button
                key={key}
                role="tab"
                aria-selected={filter === key}
                className={`nav-link ${filter === key ? 'active' : ''}`}
                onClick={() => setFilter(key)}
              >
                {FILTER_LABELS[key]} ({counts[key]})
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <div className="card card-body text-center text-muted py-4">
              <p className="mb-0">No {FILTER_LABELS[filter].toLowerCase()} trips.</p>
            </div>
          ) : (
            <div className="card table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>Route</th>
                    <th>Date</th>
                    <th>Bus</th>
                    <th>Seats</th>
                    <th>Fare</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((b) => (
                    <tr key={b.id} data-testid={`booking-${b.id}`}>
                      <td>
                        {b.fromCity} &rarr; {b.toCity}
                      </td>
                      <td>{b.journeyDate}</td>
                      <td>{b.operatorName}</td>
                      <td>{b.seatNumbers.join(', ')}</td>
                      <td>{formatFare(b.totalFare)}</td>
                      <td>
                        <span className={`badge ${b.status === 'BOOKED' ? 'text-bg-success' : 'text-bg-secondary'}`}>{b.status}</span>
                      </td>
                      <td>
                        {canCancel(b) && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => {
                              setCancelError(null);
                              setToCancel(b);
                            }}
                          >
                            Cancel booking
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {toCancel && (
        <ConfirmDialog
          title="Cancel this booking?"
          confirmLabel={cancelling ? 'Cancelling...' : 'Yes, cancel booking'}
          cancelLabel="Keep booking"
          danger
          busy={cancelling}
          error={cancelError}
          onConfirm={() => void confirmCancel()}
          onClose={() => setToCancel(null)}
        >
          <p>
            {toCancel.fromCity} &rarr; {toCancel.toCity} on {toCancel.journeyDate}, seats{' '}
            <strong>{toCancel.seatNumbers.join(', ')}</strong>. The seats will be released for other passengers.
          </p>
        </ConfirmDialog>
      )}
    </section>
  );
}
