import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ScheduleService } from '../../core/services/schedule.service';
import { BookingDraftService } from '../../core/services/booking-draft.service';
import { ScheduleSearchResult } from '../../core/models/schedule.model';

@Component({
  selector: 'app-search-results',
  standalone: true,
  templateUrl: './search-results.html',
  styleUrl: './search-results.scss',
})
export class SearchResultsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly scheduleService = inject(ScheduleService);
  private readonly draft = inject(BookingDraftService);

  readonly results = signal<ScheduleSearchResult[]>([]);
  readonly loading = signal(false);
  readonly searched = signal(false);
  from = '';
  to = '';
  date = '';

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.from = params.get('from') ?? '';
      this.to = params.get('to') ?? '';
      this.date = params.get('date') ?? '';
      if (this.from && this.to && this.date) {
        this.runSearch();
      }
    });
  }

  private runSearch(): void {
    this.loading.set(true);
    this.scheduleService.search(this.from, this.to, this.date).subscribe({
      next: (res) => {
        this.results.set(res);
        this.loading.set(false);
        this.searched.set(true);
      },
      error: () => {
        this.loading.set(false);
        this.searched.set(true);
      },
    });
  }

  selectSeats(schedule: ScheduleSearchResult): void {
    this.draft.setSchedule(schedule);
    this.router.navigate(['/seats', schedule.id]);
  }
}
