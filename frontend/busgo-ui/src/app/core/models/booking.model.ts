export type BookingStatus = 'BOOKED' | 'CANCELLED';

export interface BookingRequest {
  scheduleId: number;
  seatNumbers: string[];
}

export interface Booking {
  id: number;
  scheduleId: number;
  fromCity: string;
  toCity: string;
  journeyDate: string;
  departureTime: string;
  arrivalTime: string;
  busNumber: string;
  operatorName: string;
  seatNumbers: string[];
  status: BookingStatus;
  totalFare: number;
  bookedAt: string;
  cancelledAt: string | null;
}
