import { Component, inject, OnChanges, Output, EventEmitter, Input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BusService } from '../../../core/services/bus.service';
import { ToastService } from '../../../core/services/toast.service';
import { Bus } from '../../../core/models/bus.model';

@Component({
  selector: 'app-bus-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './bus-form.html',
  styleUrl: '../admin-forms.scss',
})
export class BusFormComponent implements OnChanges {
  @Input() editingBus: Bus | null = null;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly busService = inject(BusService);
  private readonly toast = inject(ToastService);

  readonly submitting = signal(false);

  readonly form = this.fb.nonNullable.group({
    busNumber: ['', [Validators.required]],
    operatorName: ['', [Validators.required]],
    totalSeats: [40, [Validators.required, Validators.min(1)]],
    busType: ['SEATER' as 'SEATER' | 'SLEEPER', [Validators.required]],
  });

  ngOnChanges(): void {
    if (this.editingBus) {
      this.form.patchValue({
        busNumber: this.editingBus.busNumber,
        operatorName: this.editingBus.operatorName,
        totalSeats: this.editingBus.totalSeats,
        busType: this.editingBus.busType,
      });
    } else {
      this.form.reset({ busNumber: '', operatorName: '', totalSeats: 40, busType: 'SEATER' });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const value = this.form.getRawValue();
    const request$ = this.editingBus
      ? this.busService.update(this.editingBus.id, value)
      : this.busService.create(value);

    request$.subscribe({
      next: () => {
        this.submitting.set(false);
        this.toast.success(this.editingBus ? 'Bus updated' : 'Bus created');
        this.saved.emit();
      },
      error: () => this.submitting.set(false),
    });
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
