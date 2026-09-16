import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ScheduleService } from '../../core/services/schedule.service';
import { BookingService } from '../../core/services/booking.service';
import { BookingDraftService } from '../../core/services/booking-draft.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';

interface SeatCell {
  seatNumber: string;
  row: number;
  col: string;
}

const COLUMNS = ['A', 'B', 'C', 'D'];
const MAX_SEATS = 4;

@Component({
  selector: 'app-seat-selection',
  standalone: true,
  templateUrl: './seat-selection.html',
  styleUrl: './seat-selection.scss',
})
export class SeatSelectionComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly scheduleService = inject(ScheduleService);
  private readonly bookingService = inject(BookingService);
  protected readonly draft = inject(BookingDraftService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly confirming = signal(false);
  readonly bookedSeats = signal<Set<string>>(new Set());
  readonly totalSeats = signal(0);
  readonly rows = computed<SeatCell[][]>(() => {
    const total = this.totalSeats();
    const rowCount = Math.ceil(total / COLUMNS.length);
    const grid: SeatCell[][] = [];
    for (let r = 1; r <= rowCount; r++) {
      const row: SeatCell[] = COLUMNS.map((col) => ({ seatNumber: `${r}${col}`, row: r, col }));
      grid.push(row);
    }
    return grid;
  });

  readonly selectedSeats = this.draft.selectedSeats;
  readonly schedule = this.draft.schedule;

  readonly fareTotal = computed(() => {
    const s = this.schedule();
    return s ? s.fare * this.selectedSeats().length : 0;
  });

  ngOnInit(): void {
    const scheduleId = Number(this.route.snapshot.paramMap.get('id'));
    if (!scheduleId || !this.schedule() || this.schedule()!.id !== scheduleId) {
      // Direct navigation / refresh without going through search results: send back to search.
      if (!this.schedule()) {
        this.toast.info('Please search and select a bus first.');
        this.router.navigate(['/']);
        return;
      }
    }
    this.loadSeatMap(scheduleId);
  }

  private loadSeatMap(scheduleId: number): void {
    this.loading.set(true);
    this.scheduleService.getSeatMap(scheduleId).subscribe({
      next: (seatMap) => {
        this.bookedSeats.set(new Set(seatMap.bookedSeats));
        this.totalSeats.set(seatMap.totalSeats);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  isBooked(seatNumber: string): boolean {
    return this.bookedSeats().has(seatNumber);
  }

  isSelected(seatNumber: string): boolean {
    return this.selectedSeats().includes(seatNumber);
  }

  toggleSeat(seatNumber: string): void {
    if (this.isBooked(seatNumber)) {
      return;
    }
    const ok = this.draft.toggleSeat(seatNumber, MAX_SEATS);
    if (!ok) {
      this.toast.info(`You can select up to ${MAX_SEATS} seats`);
    }
  }

  confirmBooking(): void {
    const schedule = this.schedule();
    const seats = this.selectedSeats();
    if (!schedule || seats.length === 0) {
      this.toast.info('Select at least one seat to continue.');
      return;
    }

    if (!this.auth.isLoggedIn()) {
      this.toast.info('Please log in or register to complete your booking.');
      this.router.navigate(['/login'], { queryParams: { redirectTo: `/seats/${schedule.id}` } });
      return;
    }

    this.confirming.set(true);
    this.bookingService.create({ scheduleId: schedule.id, seatNumbers: seats }).subscribe({
      next: () => {
        this.confirming.set(false);
        this.toast.success('Booking confirmed!');
        this.draft.clear();
        this.router.navigate(['/my-trips']);
      },
      error: () => {
        this.confirming.set(false);
        // Refresh the seat map in case seats were taken by someone else in the meantime.
        this.loadSeatMap(schedule.id);
      },
    });
  }
}
