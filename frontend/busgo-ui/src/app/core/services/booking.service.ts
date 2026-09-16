import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Booking, BookingRequest } from '../models/booking.model';

@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly base = `${environment.apiUrl}/bookings`;

  constructor(private http: HttpClient) {}

  create(request: BookingRequest): Observable<Booking> {
    return this.http.post<Booking>(this.base, request);
  }

  findMine(): Observable<Booking[]> {
    return this.http.get<Booking[]>(`${this.base}/mine`);
  }

  cancel(id: number): Observable<Booking> {
    return this.http.put<Booking>(`${this.base}/${id}/cancel`, {});
  }
}
