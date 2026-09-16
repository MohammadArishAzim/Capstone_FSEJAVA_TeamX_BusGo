import { Injectable, signal } from '@angular/core';
import { ScheduleSearchResult } from '../models/schedule.model';

/**
 * Holds the in-progress booking selection (chosen schedule + selected seats) purely in frontend
 * state, as specified — no backend seat-lock/TTL at this level. Cleared once a booking is
 * confirmed or the user navigates away from the flow.
 */
@Injectable({ providedIn: 'root' })
export class BookingDraftService {
  readonly schedule = signal<ScheduleSearchResult | null>(null);
  readonly selectedSeats = signal<string[]>([]);

  setSchedule(schedule: ScheduleSearchResult): void {
    this.schedule.set(schedule);
    this.selectedSeats.set([]);
  }

  toggleSeat(seatNumber: string, maxSeats = 4): boolean {
    const current = this.selectedSeats();
    if (current.includes(seatNumber)) {
      this.selectedSeats.set(current.filter((s) => s !== seatNumber));
      return true;
    }
    if (current.length >= maxSeats) {
      return false;
    }
    this.selectedSeats.set([...current, seatNumber]);
    return true;
  }

  clear(): void {
    this.schedule.set(null);
    this.selectedSeats.set([]);
  }
}
