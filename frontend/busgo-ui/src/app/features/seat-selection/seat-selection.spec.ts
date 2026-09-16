import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { SeatSelectionComponent } from './seat-selection';
import { BookingDraftService } from '../../core/services/booking-draft.service';
import { ScheduleSearchResult } from '../../core/models/schedule.model';
import { environment } from '../../../environments/environment';

describe('SeatSelectionComponent', () => {
  const schedule: ScheduleSearchResult = {
    id: 10,
    busNumber: 'KA-01-AB-1234',
    operatorName: 'VRL Travels',
    busType: 'SEATER',
    fromCity: 'Hyderabad',
    toCity: 'Bangalore',
    departureTime: '21:00:00',
    arrivalTime: '06:30:00',
    fare: 900,
    journeyDate: '2026-09-19',
    totalSeats: 40,
    seatsAvailable: 38,
  };

  let httpMock: HttpTestingController;
  let draft: BookingDraftService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeatSelectionComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '10' } } } },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    draft = TestBed.inject(BookingDraftService);
    draft.setSchedule(schedule);
  });

  afterEach(() => {
    httpMock.verify();
    draft.clear();
  });

  function createAndFlushSeatMap(bookedSeats: string[] = []) {
    const fixture = TestBed.createComponent(SeatSelectionComponent);
    fixture.detectChanges();
    const req = httpMock.expectOne(`${environment.apiUrl}/schedules/10/seats`);
    req.flush({ scheduleId: 10, totalSeats: 40, bookedSeats });
    fixture.detectChanges();
    return fixture;
  }

  it('marks seats returned by the API as booked and blocks selecting them', () => {
    const fixture = createAndFlushSeatMap(['1A', '1B']);
    const component = fixture.componentInstance;

    expect(component.isBooked('1A')).toBeTrue();
    component.toggleSeat('1A');

    expect(component.selectedSeats()).not.toContain('1A');
  });

  it('allows selecting an available seat and toggles it back off on second click', () => {
    const fixture = createAndFlushSeatMap([]);
    const component = fixture.componentInstance;

    component.toggleSeat('2C');
    expect(component.selectedSeats()).toContain('2C');

    component.toggleSeat('2C');
    expect(component.selectedSeats()).not.toContain('2C');
  });

  it('does not allow selecting more than 4 seats', () => {
    const fixture = createAndFlushSeatMap([]);
    const component = fixture.componentInstance;

    ['1A', '1B', '1C', '1D', '2A'].forEach((seat) => component.toggleSeat(seat));

    expect(component.selectedSeats().length).toBe(4);
    expect(component.selectedSeats()).not.toContain('2A');
  });

  it('computes the fare total as fare-per-seat times number of selected seats', () => {
    const fixture = createAndFlushSeatMap([]);
    const component = fixture.componentInstance;

    component.toggleSeat('1A');
    component.toggleSeat('1B');

    expect(component.fareTotal()).toBe(1800);
  });
});
