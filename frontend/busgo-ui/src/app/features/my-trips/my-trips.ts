import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BookingService } from '../../core/services/booking.service';
import { ToastService } from '../../core/services/toast.service';
import { Booking } from '../../core/models/booking.model';

@Component({
  selector: 'app-my-trips',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './my-trips.html',
  styleUrl: './my-trips.scss',
})
export class MyTripsComponent implements OnInit {
  private readonly bookingService = inject(BookingService);
  private readonly toast = inject(ToastService);

  readonly bookings = signal<Booking[]>([]);
  readonly loading = signal(true);
  readonly cancellingId = signal<number | null>(null);

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.bookingService.findMine().subscribe({
      next: (res) => {
        this.bookings.set(res);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  cancel(booking: Booking): void {
    if (booking.status === 'CANCELLED') {
      return;
    }
    if (!confirm(`Cancel booking for seats ${booking.seatNumbers.join(', ')}?`)) {
      return;
    }
    this.cancellingId.set(booking.id);
    this.bookingService.cancel(booking.id).subscribe({
      next: (updated) => {
        this.bookings.update((list) => list.map((b) => (b.id === updated.id ? updated : b)));
        this.cancellingId.set(null);
        this.toast.success('Booking cancelled. Seats are now free.');
      },
      error: () => this.cancellingId.set(null),
    });
  }
}
