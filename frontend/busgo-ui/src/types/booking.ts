export type BookingStatus = 'BOOKED' | 'CANCELLED';

export interface BookingRequest {
  scheduleId: number;
  seatNumbers: string[];
}

/** Mirrors the backend's BookingDtos.BookingResponse. */
export interface Booking {
  id: number;
  scheduleId: number;
  fromCity: string;
  toCity: string;
  journeyDate: string; // yyyy-MM-dd
  departureTime: string; // HH:mm:ss
  arrivalTime: string;
  busNumber: string;
  operatorName: string;
  seatNumbers: string[];
  status: BookingStatus;
  totalFare: number;
  bookedAt: string;
  cancelledAt: string | null;
}

/**
 * The subset of a schedule the Confirm Booking dialog needs. Deliberately a subset of the
 * search-result shape (GET /api/schedules) so Dev 4/Dev 5's schedule objects are assignable as-is.
 */
export interface BookingSchedule {
  id: number;
  fromCity: string;
  toCity: string;
  journeyDate: string;
  departureTime: string;
  arrivalTime: string;
  operatorName: string;
  busNumber: string;
  fare: number;
}
