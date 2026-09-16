import { Component, inject, OnInit, signal } from '@angular/core';
import { BusService } from '../../../core/services/bus.service';
import { ToastService } from '../../../core/services/toast.service';
import { Bus } from '../../../core/models/bus.model';
import { BusFormComponent } from '../bus-form/bus-form';

@Component({
  selector: 'app-bus-list',
  standalone: true,
  imports: [BusFormComponent],
  templateUrl: './bus-list.html',
  styleUrl: '../admin-forms.scss',
})
export class BusListComponent implements OnInit {
  private readonly busService = inject(BusService);
  private readonly toast = inject(ToastService);

  readonly buses = signal<Bus[]>([]);
  readonly loading = signal(true);
  readonly showForm = signal(false);
  readonly editingBus = signal<Bus | null>(null);

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.busService.findAll().subscribe({
      next: (res) => {
        this.buses.set(res);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  addNew(): void {
    this.editingBus.set(null);
    this.showForm.set(true);
  }

  edit(bus: Bus): void {
    this.editingBus.set(bus);
    this.showForm.set(true);
  }

  onSaved(): void {
    this.showForm.set(false);
    this.editingBus.set(null);
    this.load();
  }

  onCancelled(): void {
    this.showForm.set(false);
    this.editingBus.set(null);
  }

  remove(bus: Bus): void {
    if (!confirm(`Delete bus ${bus.busNumber}? This cannot be undone.`)) {
      return;
    }
    this.busService.delete(bus.id).subscribe({
      next: () => {
        this.toast.success('Bus deleted');
        this.load();
      },
    });
  }
}
