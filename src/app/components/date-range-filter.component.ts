import { Component, output, input, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';

export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

@Component({
  selector: 'app-date-range-filter',
  standalone: true,
  imports: [CommonModule, FormsModule, NzDatePickerModule],
  templateUrl: './date-range-filter.component.html',
  styleUrl: './date-range-filter.component.scss'
})
export class DateRangeFilterComponent {
  startDate: Date | null = null;
  endDate: Date | null = new Date();
  private hasInitialized = false;

  initialDateRange = input<DateRange>();
  dateRangeChange = output<DateRange>();

  constructor() {
    effect(() => {
      const initial = this.initialDateRange();
      
      if (!this.hasInitialized) {
        this.hasInitialized = true;
        
        if (initial && (initial.startDate !== null || initial.endDate !== null)) {
          // Use persisted values if they exist
          this.startDate = initial.startDate;
          this.endDate = initial.endDate;
        } else {
          // Use default end date (today) on first load only
          this.endDate = new Date();
          this.emitDateRange();
        }
      }
    });
  }

  onStartDateChange(date: Date | null): void {
    this.startDate = date;
    this.emitDateRange();
  }

  onEndDateChange(date: Date | null): void {
    this.endDate = date;
    this.emitDateRange();
  }

  disableStartDate = (startValue: Date): boolean => {
    if (!startValue || !this.endDate) {
      return false;
    }
    return startValue.getTime() > this.endDate.getTime();
  };

  disableEndDate = (endValue: Date): boolean => {
    if (!endValue || !this.startDate) {
      return false;
    }
    return endValue.getTime() < this.startDate.getTime();
  };

  clearDates(): void {
    this.startDate = null;
    this.endDate = null;
    this.emitDateRange();
  }

  private emitDateRange(): void {
    const range: DateRange = {
      startDate: this.startDate,
      endDate: this.endDate
    };
    this.dateRangeChange.emit(range);
  }

  get hasDateFilter(): boolean {
    return !!this.startDate || !!this.endDate;
  }
}
