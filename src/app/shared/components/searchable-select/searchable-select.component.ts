import { Component, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';

export interface SearchableSelectOption {
  id: number | string;
  label: string;
}

@Component({
  standalone: false,
  selector: 'app-searchable-select',
  templateUrl: './searchable-select.component.html',
  styleUrls: ['./searchable-select.component.scss']
})
export class SearchableSelectComponent {
  @Input() options: SearchableSelectOption[] = [];
  @Input() selected: number | string | Array<number | string> | null = null;
  @Input() placeholder = 'Select';
  @Input() multiple = false;
  @Input() disabled = false;
  @Input() allowClear = true;

  @Output() selectedChange = new EventEmitter<any>();

  opened = false;
  search = '';

  constructor(private elementRef: ElementRef<HTMLElement>) {}

  get selectedArray(): Array<number | string> {
    if (Array.isArray(this.selected)) return this.selected;
    return this.selected === null || this.selected === undefined || this.selected === '' ? [] : [this.selected];
  }

  get selectedText(): string {
    const selectedOptions = this.options.filter(option => this.isSelected(option.id));
    if (selectedOptions.length === 0) return this.placeholder;
    if (!this.multiple) return selectedOptions[0].label;
    return selectedOptions.length === 1 ? selectedOptions[0].label : `${selectedOptions.length} selected`;
  }

  get filteredOptions(): SearchableSelectOption[] {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.options;
    return this.options.filter(option => option.label.toLowerCase().includes(q) || String(option.id).toLowerCase().includes(q));
  }

  toggleOpen(): void {
    if (this.disabled) return;
    this.opened = !this.opened;
    if (this.opened) this.search = '';
  }

  choose(option: SearchableSelectOption, event?: Event): void {
    event?.stopPropagation();
    if (this.multiple) {
      const selected = this.selectedArray;
      const next = this.isSelected(option.id)
        ? selected.filter(value => value !== option.id)
        : [...selected, option.id];
      this.selectedChange.emit(next);
      return;
    }

    this.selectedChange.emit(option.id);
    this.opened = false;
  }

  clear(event: Event): void {
    event.stopPropagation();
    this.selectedChange.emit(this.multiple ? [] : null);
  }

  isSelected(id: number | string): boolean {
    return this.selectedArray.some(value => value === id);
  }

  @HostListener('document:click', ['$event'])
  closeOutside(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) this.opened = false;
  }
}
