import { BusType } from './bus.model';

export interface ScheduleSearchResult {
  id: number;
  busNumber: string;
  operatorName: string;
  busType: BusType;
  fromCity: string;
  toCity: string;
  departureTime: string; // HH:mm:ss
  arrivalTime: string;
  fare: number;
  journeyDate: string; // yyyy-MM-dd
  totalSeats: number;
  seatsAvailable: number;
}

export interface Schedule {
  id: number;
  busId: number;
  busNumber: string;
  operatorName: string;
  busType: BusType;
  fromCity: string;
  toCity: string;
  departureTime: string;
  arrivalTime: string;
  fare: number;
  journeyDate: string;
  totalSeats: number;
}

export interface ScheduleRequest {
  busId: number;
  fromCity: string;
  toCity: string;
  departureTime: string;
  arrivalTime: string;
  fare: number;
  journeyDate: string;
}

export interface SeatMap {
  scheduleId: number;
  totalSeats: number;
  bookedSeats: string[];
}
