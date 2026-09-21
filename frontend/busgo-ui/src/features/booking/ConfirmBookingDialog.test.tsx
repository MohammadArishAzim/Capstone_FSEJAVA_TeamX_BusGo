import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as bookingsApi from '../../api/bookings';
import { ApiRequestError } from '../../api/client';
import { makeBooking, schedule } from '../../test/fixtures';
import { ConfirmBookingDialog } from './ConfirmBookingDialog';

vi.mock('../../api/bookings');

describe('ConfirmBookingDialog', () => {
  beforeEach(() => vi.resetAllMocks());

  function setup(overrides: Partial<Parameters<typeof ConfirmBookingDialog>[0]> = {}) {
    const props = {
      schedule,
      seatNumbers: ['1A', '1B'],
      onBooked: vi.fn(),
      onClose: vi.fn(),
      onConflict: vi.fn(),
      ...overrides,
    };
    render(<ConfirmBookingDialog {...props} />);
    return props;
  }

  it('summarises the trip and shows seats x fare = total', () => {
    setup();

    expect(screen.getByRole('dialog', { name: 'Confirm booking' })).toBeInTheDocument();
    expect(screen.getByText(/Hyderabad/)).toBeInTheDocument();
    expect(screen.getByText('1A, 1B')).toBeInTheDocument();
    expect(screen.getByText(/2 × ₹900 =/)).toHaveTextContent('₹1800');
    expect(screen.getByRole('button', { name: 'Book seats (₹1800)' })).toBeInTheDocument();
  });

  it('creates the booking with the schedule id and seats, then reports it', async () => {
    const created = makeBooking({ id: 42 });
    vi.mocked(bookingsApi.createBooking).mockResolvedValue(created);
    const props = setup();

    await userEvent.click(screen.getByRole('button', { name: /Book seats/ }));

    expect(bookingsApi.createBooking).toHaveBeenCalledWith({ scheduleId: 10, seatNumbers: ['1A', '1B'] });
    await waitFor(() => expect(props.onBooked).toHaveBeenCalledWith(created));
  });

  it('on a 409 seat conflict: shows the reason, asks the page to refresh seats, stays open', async () => {
    vi.mocked(bookingsApi.createBooking).mockRejectedValue(new ApiRequestError(409, 'Seat(s) already booked: 1A'));
    const props = setup();

    await userEvent.click(screen.getByRole('button', { name: /Book seats/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Seat(s) already booked: 1A');
    expect(props.onConflict).toHaveBeenCalledTimes(1);
    expect(props.onBooked).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Book seats/ })).toBeEnabled(); // can retry / go back
  });

  it('does not treat other failures as seat conflicts', async () => {
    vi.mocked(bookingsApi.createBooking).mockRejectedValue(new ApiRequestError(500, 'Unexpected error'));
    const props = setup();

    await userEvent.click(screen.getByRole('button', { name: /Book seats/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Unexpected error');
    expect(props.onConflict).not.toHaveBeenCalled();
  });

  it('disables both buttons while the request is in flight', async () => {
    vi.mocked(bookingsApi.createBooking).mockReturnValue(new Promise(() => {}));
    setup();

    await userEvent.click(screen.getByRole('button', { name: /Book seats/ }));

    expect(screen.getByRole('button', { name: 'Booking...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Go back' })).toBeDisabled();
  });

  it('closes on Go back and on Escape without booking', async () => {
    const props = setup();

    await userEvent.click(screen.getByRole('button', { name: 'Go back' }));
    await userEvent.keyboard('{Escape}');

    expect(props.onClose).toHaveBeenCalledTimes(2);
    expect(bookingsApi.createBooking).not.toHaveBeenCalled();
  });
});
