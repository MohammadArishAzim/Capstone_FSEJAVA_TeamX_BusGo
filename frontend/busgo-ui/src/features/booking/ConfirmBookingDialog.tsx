import { useState } from 'react';
import { createBooking } from '../../api/bookings';
import { ApiRequestError } from '../../api/client';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import type { Booking, BookingSchedule } from '../../types/booking';
import { formatFare, formatTime } from './format';

interface ConfirmBookingDialogProps {
  schedule: BookingSchedule;
  seatNumbers: string[];
  /** Called with the created booking once POST /api/bookings succeeds. */
  onBooked: (booking: Booking) => void;
  onClose: () => void;
  /**
   * Called when the server rejects the booking with 409 (a seat was taken in the meantime), so the
   * seat-selection page (Dev 5) can refresh its seat map. The dialog stays open showing the reason.
   */
  onConflict?: () => void;
}

/**
 * Dev 6's "Confirm Booking" dialog. The seat-selection page (Dev 5) mounts it with the chosen
 * schedule + seats; the dialog shows the fare summary and owns the booking API call.
 */
export function ConfirmBookingDialog({
  schedule,
  seatNumbers,
  onBooked,
  onClose,
  onConflict,
}: ConfirmBookingDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const totalFare = schedule.fare * seatNumbers.length;

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const booking = await createBooking({ scheduleId: schedule.id, seatNumbers });
      onBooked(booking);
    } catch (e) {
      const status = e instanceof ApiRequestError ? e.status : 0;
      setError(e instanceof Error ? e.message : 'Booking failed. Please try again.');
      if (status === 409) onConflict?.();
      setBusy(false);
    }
  }

  return (
    <ConfirmDialog
      title="Confirm booking"
      confirmLabel={busy ? 'Booking...' : `Book seats (${formatFare(totalFare)})`}
      busy={busy}
      error={error}
      onConfirm={confirm}
      onClose={onClose}
    >
      <dl className="row mb-0">
        <dt className="col-4">Route</dt>
        <dd className="col-8">
            {schedule.fromCity} &rarr; {schedule.toCity}
          </dd>
        <dt className="col-4">Journey date</dt>
        <dd className="col-8">{schedule.journeyDate}</dd>
        <dt className="col-4">Timing</dt>
        <dd className="col-8">
            {formatTime(schedule.departureTime)} &rarr; {formatTime(schedule.arrivalTime)}
          </dd>
        <dt className="col-4">Bus</dt>
        <dd className="col-8">
            {schedule.operatorName} ({schedule.busNumber})
          </dd>
        <dt className="col-4">Seats</dt>
        <dd className="col-8">{seatNumbers.join(', ')}</dd>
        <dt className="col-4">Fare</dt>
        <dd className="col-8">
            {seatNumbers.length} &times; {formatFare(schedule.fare)} = <strong>{formatFare(totalFare)}</strong>
          </dd>
      </dl>
    </ConfirmDialog>
  );
}
