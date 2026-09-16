import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Schedule, ScheduleRequest, ScheduleSearchResult, SeatMap } from '../models/schedule.model';

@Injectable({ providedIn: 'root' })
export class ScheduleService {
  private readonly base = `${environment.apiUrl}/schedules`;

  constructor(private http: HttpClient) {}

  search(from: string, to: string, date: string): Observable<ScheduleSearchResult[]> {
    return this.http.get<ScheduleSearchResult[]>(this.base, { params: { from, to, date } });
  }

  getSeatMap(scheduleId: number): Observable<SeatMap> {
    return this.http.get<SeatMap>(`${this.base}/${scheduleId}/seats`);
  }

  findAll(): Observable<Schedule[]> {
    return this.http.get<Schedule[]>(`${this.base}/all`);
  }

  create(request: ScheduleRequest): Observable<Schedule> {
    return this.http.post<Schedule>(this.base, request);
  }

  update(id: number, request: ScheduleRequest): Observable<Schedule> {
    return this.http.put<Schedule>(`${this.base}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
