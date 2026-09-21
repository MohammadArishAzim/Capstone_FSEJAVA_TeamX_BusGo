/**
 * DEV-ONLY harness (route only registered when import.meta.env.DEV) for exercising Dev 6's
 * ConfirmBookingDialog against the real backend before Dev 5's seat-selection page exists.
 * Usage: /dev/booking-dialog?from=Hyderabad&to=Bangalore&date=2026-09-25&seats=5A,5B
 * It searches (public GET /api/schedules), takes the first result, and opens the dialog for it.
 */
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { ConfirmBookingDialog } from '../features/booking';
import type { BookingSchedule } from '../types/booking';

export function DevBookingDialogPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState<BookingSchedule | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seatsVersion, setSeatsVersion] = useState(0);

  const from = params.get('from') ?? 'Hyderabad';
  const to = params.get('to') ?? 'Bangalore';
  const date = params.get('date') ?? '';
  const seats = (params.get('seats') ?? '1A').split(',').filter(Boolean);

  useEffect(() => {
    const query = new URLSearchParams({ from, to, date });
    apiFetch<BookingSchedule[]>(`/schedules?${query.toString()}`)
      .then((results) => (results.length ? setSchedule(results[0]) : setError('No schedule found for that search.')))
      .catch((e: Error) => setError(e.message));
  }, [from, to, date]);

  return (
    <section>
      <h2>Confirm Booking dialog (dev harness)</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      {schedule && (
        <button className="btn btn-primary" onClick={() => setOpen(true)}>
          Book {seats.join(', ')} on {schedule.operatorName}
        </button>
      )}
      <p className="text-muted mt-3 mb-0">seat-map refreshes requested after conflicts: {seatsVersion}</p>
      {open && schedule && (
        <ConfirmBookingDialog
          schedule={schedule}
          seatNumbers={seats}
          onBooked={() => navigate('/my-trips')}
          onClose={() => setOpen(false)}
          onConflict={() => setSeatsVersion((v) => v + 1)}
        />
      )}
    </section>
  );
}
