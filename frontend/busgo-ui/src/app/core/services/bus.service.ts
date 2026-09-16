import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Bus, BusRequest } from '../models/bus.model';

@Injectable({ providedIn: 'root' })
export class BusService {
  private readonly base = `${environment.apiUrl}/buses`;

  constructor(private http: HttpClient) {}

  findAll(): Observable<Bus[]> {
    return this.http.get<Bus[]>(this.base);
  }

  create(request: BusRequest): Observable<Bus> {
    return this.http.post<Bus>(this.base, request);
  }

  update(id: number, request: BusRequest): Observable<Bus> {
    return this.http.put<Bus>(`${this.base}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
