import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BookingService } from '../../core/services/booking.service';
import { Booking } from '../../core/models/booking.model';

/**
 * Printable booking-summary ticket (stretch goal, spec section 22). No dedicated
 * GET /api/bookings/{id} endpoint exists, so this reuses findMine() (already
 * fetches all of the current user's bookings) and picks the matching id
 * client-side rather than adding a new backend endpoint just for this page.
 */
@Component({
  selector: 'app-ticket',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './ticket.html',
  styleUrl: './ticket.scss',
})
export class TicketComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly bookingService = inject(BookingService);

  readonly booking = signal<Booking | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.bookingService.findMine().subscribe({
      next: (bookings) => {
        const match = bookings.find((b) => b.id === id) ?? null;
        this.booking.set(match);
        this.notFound.set(!match);
        this.loading.set(false);
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      },
    });
  }

  print(): void {
    window.print();
  }
}
