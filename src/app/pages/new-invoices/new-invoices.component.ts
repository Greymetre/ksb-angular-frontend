import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, timeout } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { NewInvoiceFilter, NewInvoiceItem, NewInvoicePayload, NewInvoiceService, NewInvoiceSummary, RetailerOption } from '../../services/new-invoice.service';

interface SelectOption {
  id: number | string;
  label: string;
}

interface ToastModel {
  visible: boolean;
  message: string;
  type: 'success' | 'error';
}

interface InvoiceFormModel {
  id: number | null;
  secondaryCustomerId: number | null;
  invoiceNumber: string;
  invoiceDate: string;
  amount: number | null;
  points: number;
  attachment: string | null;
}

interface ApprovalDialogModel {
  visible: boolean;
  invoice: NewInvoiceItem | null;
  level: 'ss' | 'sales' | 'ho' | 'reject' | null;
  remark: string;
}

@Component({
  standalone: false,
  selector: 'app-new-invoices',
  templateUrl: './new-invoices.component.html',
  styleUrls: ['./new-invoices.component.scss']
})
export class NewInvoicesComponent implements OnInit {
  invoices: NewInvoiceItem[] = [];
  retailers: RetailerOption[] = [];
  retailerOptions: SelectOption[] = [];
  filter: NewInvoiceFilter = {};
  summary: NewInvoiceSummary = this.emptySummary();
  form: InvoiceFormModel = this.emptyForm();
  selectedAttachmentFile: File | null = null;
  approvalDialog: ApprovalDialogModel = this.emptyApprovalDialog();
  selectedInvoice: NewInvoiceItem | null = null;
  selectedRetailer: RetailerOption | null = null;
  showEntries = 10;
  loading = false;
  saving = false;
  exporting = false;
  showFilters = false;
  showModal = false;
  errorMessage = '';
  toast: ToastModel = { visible: false, message: '', type: 'success' };
  private readonly backendOrigin = this.resolveBackendOrigin();

  readonly approvalStatusOptions: SelectOption[] = [
    { id: '', label: 'All Status' },
    { id: 0, label: 'Pending' },
    { id: 1, label: 'Approved By SS' },
    { id: 2, label: 'Approved By Sales' },
    { id: 3, label: 'Approved By HO' },
    { id: 4, label: 'Rejected' }
  ];

  private toastTimeoutId?: number;

  constructor(
    private newInvoiceService: NewInvoiceService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadRetailers();
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id') || 0);
      if (id > 0) this.loadInvoice(id);
      else {
        this.selectedInvoice = null;
        this.loadInvoices();
      }
    });
  }

  get filteredInvoices(): NewInvoiceItem[] {
    return this.invoices.slice(0, this.showEntries);
  }

  get canCreate(): boolean {
    return this.authService.hasPermission('new_invoice_create');
  }

  get canAccess(): boolean {
    return this.authService.hasPermission('new_invoice_access');
  }

  get canEdit(): boolean {
    return this.authService.hasPermission('new_invoice_edit');
  }

  get canDelete(): boolean {
    return this.authService.hasPermission('new_invoice_delete');
  }

  get canApproveSs(): boolean {
    return this.authService.hasPermission('new_invoice_approve_ss');
  }

  get canApproveSales(): boolean {
    return this.authService.hasPermission('new_invoice_approve_sales');
  }

  get canApproveHo(): boolean {
    return this.authService.hasPermission('new_invoice_approve_ho');
  }

  get canReject(): boolean {
    return this.authService.hasPermission('new_invoice_reject');
  }

  get canExport(): boolean {
    return this.authService.hasAnyPermission(['new_invoice_export', 'new_invoice_access']);
  }

  loadInvoices(): void {
    this.loading = true;
    this.errorMessage = '';
    this.newInvoiceService.list(this.filter).pipe(
      timeout(20000),
      finalize(() => {
        this.loading = false;
        this.refreshView();
      })
    ).subscribe({
      next: result => {
        this.invoices = result.invoices;
        this.summary = result.summary;
        this.refreshView();
      },
      error: error => {
        this.errorMessage = error.name === 'TimeoutError' ? 'New invoices API request timed out.' : error.message;
        this.refreshView();
      }
    });
  }

  loadRetailers(): void {
    this.newInvoiceService.retailers().subscribe({
      next: retailers => {
        this.retailers = retailers;
        this.retailerOptions = retailers.map(retailer => ({ id: retailer.id, label: this.retailerLabel(retailer) }));
        this.refreshView();
      },
      error: error => this.showToast(error.message, 'error')
    });
  }

  loadInvoice(id: number): void {
    this.loading = true;
    this.errorMessage = '';
    this.newInvoiceService.get(id).pipe(
      timeout(20000),
      finalize(() => {
        this.loading = false;
        this.refreshView();
      })
    ).subscribe({
      next: invoice => {
        this.selectedInvoice = invoice;
        this.refreshView();
      },
      error: error => {
        this.errorMessage = error.name === 'TimeoutError' ? 'New invoice API request timed out.' : error.message;
        this.refreshView();
      }
    });
  }

  openShowPage(invoice: NewInvoiceItem): void {
    this.router.navigate(['/new-invoices', invoice.id]);
  }

  openCustomerShow(invoice: NewInvoiceItem): void {
    if (invoice.secondaryCustomerId > 0) this.router.navigate(['/customers', invoice.secondaryCustomerId]);
  }

  backToList(): void {
    this.router.navigate(['/new-invoices']);
  }

  openCreateModal(): void {
    this.form = this.emptyForm();
    this.selectedRetailer = null;
    this.selectedAttachmentFile = null;
    this.showModal = true;
    this.refreshView();
  }

  openEditModal(invoice: NewInvoiceItem): void {
    if (invoice.approvalStatus !== 0) {
      this.showToast('Only pending invoices can be edited.', 'error');
      return;
    }
    this.form = {
      id: invoice.id,
      secondaryCustomerId: invoice.secondaryCustomerId,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: this.toDateInput(invoice.invoiceDate),
      amount: invoice.amount,
      points: 0,
      attachment: invoice.attachment || null
    };
    this.selectedAttachmentFile = null;
    this.selectedRetailer = this.retailers.find(retailer => retailer.id === invoice.secondaryCustomerId) || {
      id: invoice.secondaryCustomerId,
      ownerName: invoice.customerName,
      shopName: invoice.shopName,
      mobileNumber: invoice.mobileNumber,
      cityName: invoice.cityName
    };
    this.showModal = true;
    this.refreshView();
  }

  closeModal(): void {
    if (this.saving) return;
    this.showModal = false;
    this.refreshView();
  }

  onRetailerChange(id: number | string | null): void {
    const retailerId = Number(id || 0);
    this.form.secondaryCustomerId = retailerId > 0 ? retailerId : null;
    this.selectedRetailer = this.retailers.find(retailer => retailer.id === retailerId) || null;
    this.refreshView();
  }

  submit(): void {
    const payload = this.buildPayload();
    if (!payload) return;

    this.saving = true;
    const request = this.form.id
      ? this.newInvoiceService.update(this.form.id, payload, this.selectedAttachmentFile)
      : this.newInvoiceService.create(payload, this.selectedAttachmentFile);

    request.pipe(finalize(() => {
      this.saving = false;
      this.refreshView();
    })).subscribe({
      next: message => {
        this.showModal = false;
        this.showToast(message, 'success');
        if (this.selectedInvoice?.id) this.loadInvoice(this.selectedInvoice.id);
        else this.loadInvoices();
      },
      error: error => this.showToast(error.message, 'error')
    });
  }

  deleteInvoice(invoice: NewInvoiceItem): void {
    if (!confirm(`Delete invoice "${invoice.invoiceNumber}"?`)) return;
    this.newInvoiceService.delete(invoice.id).subscribe({
      next: message => {
        this.showToast(message, 'success');
        if (this.selectedInvoice?.id === invoice.id) this.backToList();
        else this.loadInvoices();
      },
      error: error => this.showToast(error.message, 'error')
    });
  }

  openApprovalDialog(invoice: NewInvoiceItem, level: 'ss' | 'sales' | 'ho' | 'reject'): void {
    this.approvalDialog = { visible: true, invoice, level, remark: '' };
    this.refreshView();
  }

  closeApprovalDialog(): void {
    if (this.saving) return;
    this.approvalDialog = this.emptyApprovalDialog();
    this.refreshView();
  }

  submitApproval(): void {
    const invoice = this.approvalDialog.invoice;
    const level = this.approvalDialog.level;
    if (!invoice || !level) return;
    if (level === 'reject' && !this.approvalDialog.remark.trim()) {
      this.showToast('Remark is required to reject an invoice.', 'error');
      return;
    }

    this.saving = true;
    const request = level === 'reject'
      ? this.newInvoiceService.reject(invoice.id, this.approvalDialog.remark)
      : this.newInvoiceService.approve(invoice.id, level, this.approvalDialog.remark);

    request.pipe(finalize(() => {
      this.saving = false;
      this.refreshView();
    })).subscribe({
      next: message => {
        this.approvalDialog = this.emptyApprovalDialog();
        this.showToast(message, 'success');
        if (invoice.id === this.selectedInvoice?.id) this.loadInvoice(invoice.id);
        else this.loadInvoices();
      },
      error: error => this.showToast(error.message, 'error')
    });
  }

  approvalTitle(): string {
    const level = this.approvalDialog.level;
    if (level === 'reject') return 'Reject Invoice';
    if (level === 'ss') return 'Approve By SS';
    if (level === 'sales') return 'Approve By Sales';
    if (level === 'ho') return 'Approve By HO';
    return 'Invoice Approval';
  }

  resetFilters(): void {
    this.filter = {};
    this.loadInvoices();
  }

  exportInvoices(): void {
    this.exporting = true;
    this.newInvoiceService.export(this.filter).pipe(finalize(() => {
      this.exporting = false;
      this.refreshView();
    })).subscribe({
      next: blob => this.downloadBlob(blob, `new-invoices-${this.dateStamp()}.xlsx`),
      error: error => this.showToast(error.message, 'error')
    });
  }

  onStatusFilterChange(value: number | string | null): void {
    this.filter.approval_status = value === '' || value === null ? null : Number(value);
    this.loadInvoices();
  }

  retailerLabel(retailer: RetailerOption): string {
    return [retailer.ownerName, retailer.shopName, retailer.mobileNumber].filter(Boolean).join(' - ');
  }

  statusClass(status: number): string {
    return `status-${status}`;
  }

  formatDate(value?: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatDateTime(value?: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  canMoveToStatus(invoice: NewInvoiceItem, status: number): boolean {
    if (invoice.approvalStatus === 4 || invoice.approvalStatus === 3) return false;
    if (status === 1) return invoice.approvalStatus === 0;
    if (status === 2) return invoice.approvalStatus === 1;
    if (status === 3) return invoice.approvalStatus === 2;
    if (status === 4) return true;
    return false;
  }

  titleCase(value?: string | null): string {
    return (value || '-').replace(/\b\w/g, char => char.toUpperCase());
  }

  formatMoney(value: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value || 0);
  }

  schemeDisplay(invoice: NewInvoiceItem): string {
    return invoice.schemeName ? `${invoice.schemeName}${invoice.schemeCode ? ' (' + invoice.schemeCode + ')' : ''}` : '-';
  }

  onAttachmentChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedAttachmentFile = input.files?.[0] ?? null;
    this.refreshView();
  }

  attachmentLabel(): string {
    return this.selectedAttachmentFile?.name || this.form.attachment || 'No file selected';
  }

  mediaUrl(value?: string | null): string {
    if (!value) return '';
    const path = value.trim();
    if (!path) return '';
    if (/^(https?:)?\/\//i.test(path) || path.startsWith('data:') || path.startsWith('blob:')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.backendOrigin}${cleanPath}`;
  }

  private buildPayload(): NewInvoicePayload | null {
    if (!this.form.secondaryCustomerId) {
      this.showToast('Retailer is required.', 'error');
      return null;
    }
    if (!this.form.invoiceNumber.trim()) {
      this.showToast('Invoice number is required.', 'error');
      return null;
    }
    if (!this.form.invoiceDate) {
      this.showToast('Invoice date is required.', 'error');
      return null;
    }
    if (!this.form.amount || this.form.amount <= 0) {
      this.showToast('Amount must be greater than 0.', 'error');
      return null;
    }
    return {
      secondary_customer_id: this.form.secondaryCustomerId,
      invoice_number: this.form.invoiceNumber.trim(),
      invoice_date: this.form.invoiceDate,
      amount: Number(this.form.amount),
      points: 0,
      attachment: this.form.attachment
    };
  }

  private toDateInput(value: string): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value.slice(0, 10);
    return date.toISOString().slice(0, 10);
  }

  private emptyForm(): InvoiceFormModel {
    return {
      id: null,
      secondaryCustomerId: null,
      invoiceNumber: '',
      invoiceDate: new Date().toISOString().slice(0, 10),
      amount: null,
      points: 0,
      attachment: null
    };
  }

  private emptySummary(): NewInvoiceSummary {
    return {
      totalInvoices: 0,
      totalRetailers: 0,
      approvedSs: 0,
      approvedSales: 0,
      approvedHo: 0,
      pending: 0,
      rejected: 0,
      totalPoints: 0,
      totalAmount: 0
    };
  }

  private emptyApprovalDialog(): ApprovalDialogModel {
    return {
      visible: false,
      invoice: null,
      level: null,
      remark: ''
    };
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

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  private dateStamp(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private resolveBackendOrigin(): string {
    const { protocol, hostname, port } = window.location;
    if (port === '4200') return `${protocol}//${hostname === 'localhost' ? '127.0.0.1' : hostname}:5172`;
    return window.location.origin;
  }
}
