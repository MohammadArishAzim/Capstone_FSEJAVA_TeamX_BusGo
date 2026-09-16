export type BusType = 'SLEEPER' | 'SEATER';

export interface Bus {
  id: number;
  busNumber: string;
  operatorName: string;
  totalSeats: number;
  busType: BusType;
}

export interface BusRequest {
  busNumber: string;
  operatorName: string;
  totalSeats: number;
  busType: BusType;
}
