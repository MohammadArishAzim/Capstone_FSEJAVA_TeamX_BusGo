import type { Booking, BookingRequest } from '../types/booking';
import { apiFetch } from './client';

export function createBooking(request: BookingRequest): Promise<Booking> {
  return apiFetch<Booking>('/bookings', { method: 'POST', body: JSON.stringify(request) });
}

export function fetchMyBookings(): Promise<Booking[]> {
  return apiFetch<Booking[]>('/bookings/mine');
}

export function cancelBooking(id: number): Promise<Booking> {
  return apiFetch<Booking>(`/bookings/${id}/cancel`, { method: 'PUT' });
}
