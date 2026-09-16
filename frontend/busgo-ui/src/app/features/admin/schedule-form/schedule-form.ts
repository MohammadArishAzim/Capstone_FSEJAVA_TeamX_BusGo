import { Component, EventEmitter, inject, Input, OnChanges, OnInit, Output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ScheduleService } from '../../../core/services/schedule.service';
import { BusService } from '../../../core/services/bus.service';
import { ToastService } from '../../../core/services/toast.service';
import { Schedule } from '../../../core/models/schedule.model';
import { Bus } from '../../../core/models/bus.model';

@Component({
  selector: 'app-schedule-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './schedule-form.html',
  styleUrl: '../admin-forms.scss',
})
export class ScheduleFormComponent implements OnInit, OnChanges {
  @Input() editingSchedule: Schedule | null = null;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly scheduleService = inject(ScheduleService);
  private readonly busService = inject(BusService);
  private readonly toast = inject(ToastService);

  readonly submitting = signal(false);
  readonly buses = signal<Bus[]>([]);

  readonly form = this.fb.nonNullable.group({
    busId: [0, [Validators.required, Validators.min(1)]],
    fromCity: ['', [Validators.required]],
    toCity: ['', [Validators.required]],
    departureTime: ['', [Validators.required]],
    arrivalTime: ['', [Validators.required]],
    fare: [0, [Validators.required, Validators.min(1)]],
    journeyDate: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.busService.findAll().subscribe((buses) => this.buses.set(buses));
  }

  ngOnChanges(): void {
    if (this.editingSchedule) {
      const s = this.editingSchedule;
      this.form.patchValue({
        busId: s.busId,
        fromCity: s.fromCity,
        toCity: s.toCity,
        departureTime: s.departureTime.slice(0, 5),
        arrivalTime: s.arrivalTime.slice(0, 5),
        fare: s.fare,
        journeyDate: s.journeyDate,
      });
    } else {
      this.form.reset({ busId: 0, fromCity: '', toCity: '', departureTime: '', arrivalTime: '', fare: 0, journeyDate: '' });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const value = this.form.getRawValue();
    const request$ = this.editingSchedule
      ? this.scheduleService.update(this.editingSchedule.id, value)
      : this.scheduleService.create(value);

    request$.subscribe({
      next: () => {
        this.submitting.set(false);
        this.toast.success(this.editingSchedule ? 'Schedule updated' : 'Schedule created');
        this.saved.emit();
      },
      error: () => this.submitting.set(false),
    });
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
