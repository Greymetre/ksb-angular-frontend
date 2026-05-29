import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { finalize, timeout } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import {
  LoyaltyScheme,
  LoyaltySchemeOption,
  LoyaltySchemeOptions,
  LoyaltySchemePayload,
  LoyaltySchemeService
} from '../../services/loyalty-scheme.service';

interface SchemeFormModel {
  id: number | null;
  active: string;
  schemeName: string;
  schemeCode: string;
  schemeDescription: string;
  schemeTag: string;
  customerType: string;
  areaScope: string;
  areaValues: string[];
  startDate: string;
  endDate: string;
  schemeType: string;
  basedOn: string;
  status: string;
  slabs: Array<{
    tierName: string;
    valueFrom: number | null;
    valueTo: number | null;
    rewardValue: number | null;
  }>;
}

interface ToastModel {
  visible: boolean;
  message: string;
  type: 'success' | 'error';
}

@Component({
  standalone: false,
  selector: 'app-loyalty-schemes',
  templateUrl: './loyalty-schemes.component.html',
  styleUrls: ['./loyalty-schemes.component.scss']
})
export class LoyaltySchemesComponent implements OnInit {
  schemes: LoyaltyScheme[] = [];
  options: LoyaltySchemeOptions = { branches: [], zones: [], states: [], customers: [] };
  customerTypes = ['Retailer', 'Plumber', 'Retailer + Plumber', 'Sub-Dealer', 'Distributor'];
  schemeTags = ['Regular', 'Booster'];
  areaScopes = ['All', 'Branch', 'Zone', 'State', 'Customer'];
  basedOnOptions = ['Value', 'Percentage'];
  statuses = ['Draft', 'Live', 'Ended'];

  showEntries = 10;
  searchQuery = '';
  selectedStatus = '';
  loading = false;
  saving = false;
  generatingCode = false;
  showFilters = false;
  showModal = false;
  errorMessage = '';
  toast: ToastModel = { visible: false, message: '', type: 'success' };
  form: SchemeFormModel = this.emptyForm();
  private toastTimeoutId?: number;
  private codeGenerateTimeoutId?: number;

  constructor(
    private schemeService: LoyaltySchemeService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadOptions();
    this.loadSchemes();
  }

  get filteredSchemes(): LoyaltyScheme[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.schemes;

    return this.schemes.filter(scheme =>
      scheme.schemeName.toLowerCase().includes(q)
      || scheme.schemeCode.toLowerCase().includes(q)
      || scheme.customerType.toLowerCase().includes(q)
      || scheme.areaDisplay.toLowerCase().includes(q)
      || scheme.schemeTag.toLowerCase().includes(q)
    );
  }

  get pagedSchemes(): LoyaltyScheme[] {
    return this.filteredSchemes.slice(0, this.showEntries);
  }

  get areaOptions(): LoyaltySchemeOption[] {
    switch (this.form.areaScope) {
      case 'Branch': return this.options.branches;
      case 'Zone': return this.options.zones;
      case 'State': return this.options.states;
      case 'Customer': return this.options.customers;
      default: return [];
    }
  }

  get canCreate(): boolean {
    return this.authService.hasPermission('scheme_create');
  }

  get canEdit(): boolean {
    return this.authService.hasPermission('scheme_edit');
  }

  get canDelete(): boolean {
    return this.authService.hasPermission('scheme_delete');
  }

  loadSchemes(): void {
    this.loading = true;
    this.errorMessage = '';
    this.schemeService.list({ status: this.selectedStatus || undefined }).pipe(
      timeout(20000),
      finalize(() => {
        this.loading = false;
        this.refreshView();
      })
    ).subscribe({
      next: schemes => {
        this.schemes = schemes;
        this.refreshView();
      },
      error: error => {
        this.errorMessage = error.name === 'TimeoutError' ? 'Schemes API request timed out.' : error.message;
        this.refreshView();
      }
    });
  }

  loadOptions(): void {
    this.schemeService.options().subscribe({
      next: options => {
        this.options = options;
        this.refreshView();
      },
      error: error => this.showToast(error.message, 'error')
    });
  }

  applyFilters(): void {
    this.loadSchemes();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedStatus = '';
    this.loadSchemes();
  }

  openCreate(): void {
    this.form = this.emptyForm();
    this.errorMessage = '';
    this.showModal = true;
    this.generateSchemeCode();
    this.refreshView();
  }

  openEdit(scheme: LoyaltyScheme): void {
    this.form = {
      id: scheme.id,
      active: scheme.active || 'Y',
      schemeName: scheme.schemeName,
      schemeCode: scheme.schemeCode,
      schemeDescription: scheme.schemeDescription || '',
      schemeTag: scheme.schemeTag || 'Regular',
      customerType: scheme.customerType,
      areaScope: scheme.areaScope || 'All',
      areaValues: [...(scheme.areaValues || [])],
      startDate: this.toDateInput(scheme.startDate),
      endDate: this.toDateInput(scheme.endDate),
      schemeType: 'Invoice',
      basedOn: scheme.basedOn || 'Value',
      status: scheme.status || 'Draft',
      slabs: scheme.slabs.length ? scheme.slabs.map(slab => ({
        tierName: slab.tierName,
        valueFrom: slab.valueFrom,
        valueTo: slab.valueTo,
        rewardValue: slab.rewardValue
      })) : [this.emptySlab()]
    };
    this.errorMessage = '';
    this.showModal = true;
    this.refreshView();
  }

  closeModal(): void {
    if (this.saving) return;
    this.showModal = false;
    this.refreshView();
  }

  changeAreaScope(): void {
    this.form.areaValues = [];
  }

  addSlab(): void {
    this.form.slabs.push(this.emptySlab());
  }

  removeSlab(index: number): void {
    if (this.form.slabs.length === 1) return;
    this.form.slabs.splice(index, 1);
  }

  scheduleGenerateCode(): void {
    if (this.form.id) return;
    if (this.codeGenerateTimeoutId) window.clearTimeout(this.codeGenerateTimeoutId);
    this.codeGenerateTimeoutId = window.setTimeout(() => this.generateSchemeCode(), 350);
  }

  private generateSchemeCode(): void {
    if (this.form.id) return;
    this.generatingCode = true;
    this.schemeService.generateCode(this.form.schemeName, this.form.schemeTag, this.form.basedOn).pipe(
      finalize(() => {
        this.generatingCode = false;
        this.refreshView();
      })
    ).subscribe({
      next: code => {
        this.form.schemeCode = code || this.localFallbackCode();
        this.refreshView();
      },
      error: error => {
        this.form.schemeCode = this.localFallbackCode();
        this.showToast(error.message || 'Unable to check last scheme code. A temporary code was generated.', 'error');
        this.refreshView();
      }
    });
  }

  submit(status?: string): void {
    if (status) this.form.status = status;
    const payload = this.buildPayload();
    const validation = this.validatePayload(payload);
    if (validation) {
      this.showToast(validation, 'error');
      return;
    }

    this.saving = true;
    const request = this.form.id
      ? this.schemeService.update(this.form.id, payload)
      : this.schemeService.create(payload);

    request.pipe(finalize(() => {
      this.saving = false;
      this.refreshView();
    })).subscribe({
      next: message => {
        this.showModal = false;
        this.showToast(message, 'success');
        this.loadSchemes();
      },
      error: error => this.showToast(error.message, 'error')
    });
  }

  deleteScheme(scheme: LoyaltyScheme): void {
    if (!confirm(`Delete scheme "${scheme.schemeName}"?`)) return;

    this.loading = true;
    this.schemeService.delete(scheme.id).subscribe({
      next: message => {
        this.showToast(message, 'success');
        this.loadSchemes();
      },
      error: error => {
        this.loading = false;
        this.showToast(error.message, 'error');
        this.refreshView();
      }
    });
  }

  formatDate(value?: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  rewardLabel(): string {
    return this.form.basedOn === 'Percentage' ? 'Reward %' : 'Reward Amount';
  }

  private buildPayload(): LoyaltySchemePayload {
    return {
      active: this.form.active,
      scheme_name: this.form.schemeName.trim(),
      scheme_code: this.form.schemeCode.trim(),
      scheme_description: this.form.schemeDescription.trim() || null,
      scheme_tag: this.form.schemeTag,
      customer_type: this.form.customerType,
      area_scope: this.form.areaScope,
      area_values: this.form.areaScope === 'All' ? [] : this.form.areaValues,
      start_date: this.form.startDate,
      end_date: this.form.endDate,
      scheme_type: 'Invoice',
      based_on: this.form.basedOn,
      status: this.form.status,
      slabs: this.form.slabs.map(slab => ({
        tier_name: slab.tierName.trim(),
        value_from: Number(slab.valueFrom ?? 0),
        value_to: slab.valueTo === null || slab.valueTo === undefined ? null : Number(slab.valueTo),
        reward_value: Number(slab.rewardValue ?? 0)
      }))
    };
  }

  private validatePayload(payload: LoyaltySchemePayload): string {
    if (!payload.scheme_name) return 'Scheme name is required.';
    if (!payload.customer_type) return 'Customer type is required.';
    if (!payload.start_date || !payload.end_date) return 'Start date and end date are required.';
    if (payload.area_scope !== 'All' && payload.area_values.length === 0) return 'Select at least one area value.';
    if (payload.slabs.some(slab => !slab.tier_name || slab.value_from < 0 || slab.reward_value < 0)) return 'Complete all slab rows.';
    if (payload.slabs.some(slab => slab.value_to !== null && slab.value_to < slab.value_from)) return 'Slab value to must be greater than value from.';
    return '';
  }

  private emptyForm(): SchemeFormModel {
    return {
      id: null,
      active: 'Y',
      schemeName: '',
      schemeCode: '',
      schemeDescription: '',
      schemeTag: 'Regular',
      customerType: 'Retailer',
      areaScope: 'All',
      areaValues: [],
      startDate: '',
      endDate: '',
      schemeType: 'Invoice',
      basedOn: 'Value',
      status: 'Draft',
      slabs: [this.emptySlab()]
    };
  }

  private emptySlab() {
    return { tierName: '', valueFrom: 0, valueTo: null, rewardValue: 0 };
  }

  private localFallbackCode(): string {
    const namePart = this.abbr(this.form.schemeName || 'Scheme');
    const tagPart = this.form.schemeTag === 'Booster' ? 'BST' : 'REG';
    const basisPart = this.form.basedOn === 'Percentage' ? 'PCT' : 'VAL';
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 99) + 1;
    return `${tagPart}-${namePart}-INV-${basisPart}-${year}-${String(random).padStart(2, '0')}`.toUpperCase();
  }

  private abbr(value: string): string {
    const clean = value.replace(/[^a-zA-Z0-9 ]/g, ' ').trim();
    if (!clean) return 'SCH';
    const words = clean.split(/\s+/).slice(0, 3);
    return words.map(word => word[0]).join('').padEnd(3, clean[0]).slice(0, 5);
  }

  private toDateInput(value?: string | null): string {
    if (!value) return '';
    return value.slice(0, 10);
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    if (!message) return;
    this.toast = { visible: true, message, type };
    if (this.toastTimeoutId) window.clearTimeout(this.toastTimeoutId);
    this.toastTimeoutId = window.setTimeout(() => {
      this.toast = { ...this.toast, visible: false };
      this.refreshView();
    }, 3500);
    this.refreshView();
  }

  private refreshView(): void {
    this.cdr.detectChanges();
  }
}
