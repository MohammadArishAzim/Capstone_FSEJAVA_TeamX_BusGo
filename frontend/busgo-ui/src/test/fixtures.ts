import type { Booking, BookingSchedule } from '../types/booking';

export function isoDateFromToday(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: 1,
    scheduleId: 10,
    fromCity: 'Hyderabad',
    toCity: 'Bangalore',
    journeyDate: isoDateFromToday(3),
    departureTime: '21:00:00',
    arrivalTime: '06:30:00',
    busNumber: 'KA-01-AB-1234',
    operatorName: 'VRL Travels',
    seatNumbers: ['1A', '1B'],
    status: 'BOOKED',
    totalFare: 1800,
    bookedAt: '2026-09-16T17:56:32Z',
    cancelledAt: null,
    ...overrides,
  };
}

export const schedule: BookingSchedule = {
  id: 10,
  fromCity: 'Hyderabad',
  toCity: 'Bangalore',
  journeyDate: isoDateFromToday(3),
  departureTime: '21:00:00',
  arrivalTime: '06:30:00',
  operatorName: 'VRL Travels',
  busNumber: 'KA-01-AB-1234',
  fare: 900,
};
