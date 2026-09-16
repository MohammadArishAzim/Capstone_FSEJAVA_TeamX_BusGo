import { Component, inject, OnInit, signal } from '@angular/core';
import { ScheduleService } from '../../../core/services/schedule.service';
import { ToastService } from '../../../core/services/toast.service';
import { Schedule } from '../../../core/models/schedule.model';
import { ScheduleFormComponent } from '../schedule-form/schedule-form';

@Component({
  selector: 'app-schedule-list',
  standalone: true,
  imports: [ScheduleFormComponent],
  templateUrl: './schedule-list.html',
  styleUrl: '../admin-forms.scss',
})
export class ScheduleListComponent implements OnInit {
  private readonly scheduleService = inject(ScheduleService);
  private readonly toast = inject(ToastService);

  readonly schedules = signal<Schedule[]>([]);
  readonly loading = signal(true);
  readonly showForm = signal(false);
  readonly editingSchedule = signal<Schedule | null>(null);

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.scheduleService.findAll().subscribe({
      next: (res) => {
        this.schedules.set(res);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  addNew(): void {
    this.editingSchedule.set(null);
    this.showForm.set(true);
  }

  edit(schedule: Schedule): void {
    this.editingSchedule.set(schedule);
    this.showForm.set(true);
  }

  onSaved(): void {
    this.showForm.set(false);
    this.editingSchedule.set(null);
    this.load();
  }

  onCancelled(): void {
    this.showForm.set(false);
    this.editingSchedule.set(null);
  }

  remove(schedule: Schedule): void {
    if (!confirm(`Delete this schedule (${schedule.fromCity} -> ${schedule.toCity} on ${schedule.journeyDate})?`)) {
      return;
    }
    this.scheduleService.delete(schedule.id).subscribe({
      next: () => {
        this.toast.success('Schedule deleted');
        this.load();
      },
    });
  }
}
