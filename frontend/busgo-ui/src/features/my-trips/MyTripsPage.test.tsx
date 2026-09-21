import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as bookingsApi from '../../api/bookings';
import { ApiRequestError } from '../../api/client';
import { AuthContext, type AuthContextValue } from '../../auth/AuthContext';
import { isoDateFromToday, makeBooking } from '../../test/fixtures';
import { MyTripsPage } from './MyTripsPage';

vi.mock('../../api/bookings');

const logout = vi.fn();
const auth: AuthContextValue = {
  user: { email: 'p@example.com', name: 'Passenger', isAdmin: false },
  isLoggedIn: true,
  login: vi.fn(),
  logout,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={auth}>
        <MyTripsPage />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

const active = makeBooking({ id: 1, seatNumbers: ['1A', '1B'] });
const cancelled = makeBooking({ id: 2, status: 'CANCELLED', seatNumbers: ['9C'], cancelledAt: '2026-09-17T10:00:00Z' });
const past = makeBooking({ id: 3, journeyDate: '2020-01-01', seatNumbers: ['4D'] });

describe('MyTripsPage', () => {
  beforeEach(() => vi.resetAllMocks());

  it('shows a loading state, then active and cancelled bookings with status badges', async () => {
    vi.mocked(bookingsApi.fetchMyBookings).mockResolvedValue([active, cancelled]);
    renderPage();

    expect(screen.getByText('Loading your trips...')).toBeInTheDocument();
    const activeRow = await screen.findByTestId('booking-1');
    expect(within(activeRow).getByText('BOOKED')).toBeInTheDocument();
    expect(within(activeRow).getByText('1A, 1B')).toBeInTheDocument();
    expect(within(activeRow).getByText('₹1800')).toBeInTheDocument();
    expect(within(screen.getByTestId('booking-2')).getByText('CANCELLED')).toBeInTheDocument();
  });

  it('shows an empty state with a link to search when there are no bookings', async () => {
    vi.mocked(bookingsApi.fetchMyBookings).mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText(/haven't booked any trips/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Search buses' })).toHaveAttribute('href', '/');
  });

  it('filters between All, Active and Cancelled with counts', async () => {
    vi.mocked(bookingsApi.fetchMyBookings).mockResolvedValue([active, cancelled]);
    renderPage();
    await screen.findByTestId('booking-1');

    expect(screen.getByRole('tab', { name: 'All (2)' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Cancelled (1)' }));
    expect(screen.queryByTestId('booking-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('booking-2')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Active (1)' }));
    expect(screen.getByTestId('booking-1')).toBeInTheDocument();
    expect(screen.queryByTestId('booking-2')).not.toBeInTheDocument();
  });

  it('offers cancel only for active trips that have not departed', async () => {
    vi.mocked(bookingsApi.fetchMyBookings).mockResolvedValue([active, cancelled, past]);
    renderPage();
    await screen.findByTestId('booking-1');

    expect(within(screen.getByTestId('booking-1')).getByRole('button', { name: 'Cancel booking' })).toBeInTheDocument();
    expect(within(screen.getByTestId('booking-2')).queryByRole('button')).not.toBeInTheDocument(); // cancelled
    expect(within(screen.getByTestId('booking-3')).queryByRole('button')).not.toBeInTheDocument(); // past
  });

  it('cancels after confirmation: calls the API, flips the row to CANCELLED, and confirms to the user', async () => {
    vi.mocked(bookingsApi.fetchMyBookings).mockResolvedValue([active]);
    vi.mocked(bookingsApi.cancelBooking).mockResolvedValue({ ...active, status: 'CANCELLED', cancelledAt: 'now' });
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Cancel booking' }));
    const dialog = screen.getByRole('dialog', { name: 'Cancel this booking?' });
    expect(dialog).toHaveTextContent('1A, 1B');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Yes, cancel booking' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(bookingsApi.cancelBooking).toHaveBeenCalledWith(1);
    expect(within(screen.getByTestId('booking-1')).getByText('CANCELLED')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Booking #1 cancelled');
  });

  it('does nothing when the user keeps the booking', async () => {
    vi.mocked(bookingsApi.fetchMyBookings).mockResolvedValue([active]);
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Cancel booking' }));
    await userEvent.click(screen.getByRole('button', { name: 'Keep booking' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(bookingsApi.cancelBooking).not.toHaveBeenCalled();
    expect(within(screen.getByTestId('booking-1')).getByText('BOOKED')).toBeInTheDocument();
  });

  it('shows the server reason in the dialog when cancelling fails, and reloads on a 409', async () => {
    vi.mocked(bookingsApi.fetchMyBookings).mockResolvedValue([active]);
    vi.mocked(bookingsApi.cancelBooking).mockRejectedValue(new ApiRequestError(409, 'Booking is already cancelled'));
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Cancel booking' }));
    await userEvent.click(screen.getByRole('button', { name: 'Yes, cancel booking' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Booking is already cancelled');
    await waitFor(() => expect(bookingsApi.fetchMyBookings).toHaveBeenCalledTimes(2));
  });

  it('shows an error with a retry when loading fails', async () => {
    vi.mocked(bookingsApi.fetchMyBookings)
      .mockRejectedValueOnce(new ApiRequestError(0, 'Could not reach the server. Is the backend running?'))
      .mockResolvedValueOnce([active]);
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the server');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByTestId('booking-1')).toBeInTheDocument();
  });

  it('logs the user out when the token is rejected (401)', async () => {
    vi.mocked(bookingsApi.fetchMyBookings).mockRejectedValue(new ApiRequestError(401, 'Authentication is required'));
    renderPage();

    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
  });

  it('treats today as still upcoming', async () => {
    const today = makeBooking({ id: 5, journeyDate: isoDateFromToday(0) });
    vi.mocked(bookingsApi.fetchMyBookings).mockResolvedValue([today]);
    renderPage();

    expect(await screen.findByRole('button', { name: 'Cancel booking' })).toBeInTheDocument();
  });
});
