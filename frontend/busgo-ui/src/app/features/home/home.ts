import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

function todayIso(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomeComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly minDate = todayIso();

  readonly form = this.fb.nonNullable.group({
    from: ['Hyderabad', [Validators.required]],
    to: ['Bangalore', [Validators.required]],
    date: [this.defaultDate(), [Validators.required]],
  });

  private defaultDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  }

  swapCities(): void {
    const { from, to } = this.form.value;
    this.form.patchValue({ from: to, to: from });
  }

  search(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { from, to, date } = this.form.getRawValue();
    this.router.navigate(['/search'], { queryParams: { from, to, date } });
  }
}
