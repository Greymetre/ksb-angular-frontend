import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { finalize, timeout } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { UserOption } from '../../services/user.service';
import { Order, OrderDetailPayload, OrderFilters, OrderProductOption, OrderService } from '../../services/order.service';
import { kolkataTodayInput } from '../../shared/utils/date-time';

interface ToastModel {
  visible: boolean;
  message: string;
  type: 'success' | 'error';
}

interface OrderRow extends OrderDetailPayload {
  products: OrderProductOption[];
  loadingProducts: boolean;
}

@Component({
  standalone: false,
  selector: 'app-orders',
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss']
})
export class OrdersComponent implements OnInit {
  orders: Order[] = [];
  users: UserOption[] = [];
  divisions: UserOption[] = [];
  designations: UserOption[] = [];
  retailers: UserOption[] = [];
  distributors: UserOption[] = [];
  families: UserOption[] = [];

  showEntries = 10;
  currentPage = 1;
  searchQuery = '';
  appliedSearchQuery = '';
  selectedRetailerId: number | null = null;
  selectedDistributorId: number | null = null;
  selectedUserId: number | null = null;
  selectedDivisionId: number | null = null;
  selectedDesignationIds: number[] = [];
  selectedStatus: number | null = null;
  startDate = '';
  endDate = '';

  loading = false;
  saving = false;
  exporting = false;
  showFilters = false;
  showCreateModal = false;
  errorMessage = '';
  toast: ToastModel = { visible: false, message: '', type: 'success' };
  private toastTimeoutId?: number;
  private searchTimeoutId?: number;

  form = this.emptyForm();

  constructor(
    private orderService: OrderService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadOptions();
    this.loadOrders();
  }

  get pagedOrders(): Order[] {
    return this.orders.slice(this.pageStart, this.pageStart + this.safeShowEntries);
  }

  get pageStart(): number {
    return (this.currentPage - 1) * this.safeShowEntries;
  }

  get canCreate(): boolean {
    return this.authService.hasAnyPermission(['order_access', 'order_create']);
  }

  get canExport(): boolean {
    return this.authService.hasAnyPermission(['order_access', 'order_download']);
  }

  get totalAmount(): number {
    return this.form.rows.reduce((sum, row) => sum + (Number(row.lineTotal) || 0), 0);
  }

  get totalQty(): number {
    return this.form.rows.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
  }

  get totalGst(): number {
    return 0;
  }

  get showBuyer(): boolean {
    return this.form.type !== 'DISTRIBUTER';
  }

  loadOrders(): void {
    this.loading = true;
    this.errorMessage = '';
    this.currentPage = 1;
    this.orderService.getOrders(this.currentFilters()).pipe(
      timeout(20000),
      finalize(() => {
        this.loading = false;
        this.refreshView();
      })
    ).subscribe({
      next: rows => {
        this.orders = rows;
        this.refreshView();
      },
      error: error => {
        this.errorMessage = error.name === 'TimeoutError' ? 'Order API request timed out.' : error.message;
        this.refreshView();
      }
    });
  }

  loadOptions(): void {
    this.orderService.getOptions().pipe(timeout(20000)).subscribe({
      next: options => {
        this.users = options.users;
        this.divisions = options.divisions;
        this.designations = options.designations;
        this.retailers = options.retailers;
        this.distributors = options.distributors;
        this.families = options.families;
        this.refreshView();
      },
      error: error => this.showToast(error.message, 'error')
    });
  }

  applyFilters(): void {
    if (this.searchTimeoutId) window.clearTimeout(this.searchTimeoutId);
    this.loadOrders();
  }

  scheduleSearch(): void {
    if (this.searchTimeoutId) window.clearTimeout(this.searchTimeoutId);
    this.searchTimeoutId = window.setTimeout(() => {
      this.appliedSearchQuery = this.searchQuery;
      this.loadOrders();
    }, 400);
  }

  clearFilters(): void {
    this.selectedRetailerId = null;
    this.selectedDistributorId = null;
    this.selectedUserId = null;
    this.selectedDivisionId = null;
    this.selectedDesignationIds = [];
    this.selectedStatus = null;
    this.startDate = '';
    this.endDate = '';
    this.searchQuery = '';
    this.appliedSearchQuery = '';
    this.loadOrders();
  }

  resetPage(): void {
    this.currentPage = 1;
  }

  openCreateModal(): void {
    this.form = this.emptyForm();
    this.showCreateModal = true;
    this.errorMessage = '';
    this.refreshView();
  }

  closeCreateModal(): void {
    if (this.saving) return;
    this.showCreateModal = false;
    this.refreshView();
  }

  onTypeChange(): void {
    if (!this.showBuyer) this.form.buyerId = null;
  }

  onFamilyChange(row: OrderRow): void {
    row.productId = null;
    row.mrp = null;
    row.lineTotal = null;
    row.taxAmount = null;
    row.products = [];
    if (!row.subcategoryId) return;

    row.loadingProducts = true;
    this.orderService.getProductsByFamily(row.subcategoryId).pipe(finalize(() => {
      row.loadingProducts = false;
      this.refreshView();
    })).subscribe({
      next: products => row.products = products,
      error: error => this.showToast(error.message, 'error')
    });
  }

  onProductChange(row: OrderRow): void {
    const product = row.products.find(item => item.id === row.productId);
    row.mrp = product?.price ?? product?.hsnSac ?? 0;
    this.recalculateRow(row);
  }

  recalculateRow(row: OrderRow): void {
    const quantity = Number(row.quantity) || 0;
    const price = Number(row.mrp) || 0;
    const amount = quantity * price;
    row.gst = 0;
    row.taxAmount = 0;
    row.lineTotal = amount;
  }

  addRow(): void {
    this.form.rows.push(this.emptyRow());
  }

  removeRow(index: number): void {
    if (this.form.rows.length === 1) {
      this.showToast('At least one row required.', 'error');
      return;
    }
    this.form.rows.splice(index, 1);
  }

  submitOrder(): void {
    if (!this.form.orderDate || !this.form.executiveId || !this.form.type || !this.form.sellerId) {
      this.showToast('Order Date, Employee, Customer Type and Dealer / Distributor are required.', 'error');
      return;
    }
    if (this.showBuyer && !this.form.buyerId) {
      this.showToast('Customer is required.', 'error');
      return;
    }
    const validRows = this.form.rows.filter(row => row.productId && (Number(row.quantity) || 0) > 0);
    if (!validRows.length) {
      this.showToast('Please add at least one product row.', 'error');
      return;
    }

    this.saving = true;
    this.orderService.createOrder({
      orderDate: this.form.orderDate,
      executiveId: this.form.executiveId,
      type: this.form.type,
      buyerId: this.showBuyer ? this.form.buyerId : null,
      sellerId: this.form.sellerId,
      subTotal: this.totalAmount,
      grandTotal: this.totalAmount,
      totalQty: this.totalQty,
      totalGst: this.totalGst,
      orderRemark: this.form.orderRemark,
      orderDetail: validRows.map(row => ({
        subcategoryId: row.subcategoryId,
        productId: row.productId,
        quantity: Number(row.quantity) || 0,
        mrp: Number(row.mrp) || 0,
        gst: 0,
        taxAmount: 0,
        lineTotal: Number(row.lineTotal) || 0
      }))
    }).pipe(finalize(() => {
      this.saving = false;
      this.refreshView();
    })).subscribe({
      next: result => {
        this.showCreateModal = false;
        this.showToast(result.message, 'success');
        this.loadOrders();
      },
      error: error => this.showToast(error.message, 'error')
    });
  }

  exportOrders(): void {
    this.exporting = true;
    this.showToast('Exporting...', 'success');
    this.orderService.exportOrders(this.currentFilters()).pipe(finalize(() => {
      this.exporting = false;
      this.refreshView();
    })).subscribe({
      next: blob => this.downloadBlob(blob, `orders-${kolkataTodayInput()}.xlsx`),
      error: error => this.showToast(error.message, 'error')
    });
  }

  formatDate(value?: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-IN');
  }

  formatDateTime(value?: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-IN');
  }

  private currentFilters(): OrderFilters {
    return {
      retailersId: this.selectedRetailerId,
      distributorId: this.selectedDistributorId,
      userId: this.selectedUserId,
      divisionId: this.selectedDivisionId,
      designationIds: this.selectedDesignationIds,
      pendingStatus: this.selectedStatus,
      startDate: this.startDate || null,
      endDate: this.endDate || null,
      search: this.appliedSearchQuery || null
    };
  }

  private emptyForm() {
    return {
      orderDate: kolkataTodayInput(),
      executiveId: null as number | null,
      type: 'RETAILER',
      buyerId: null as number | null,
      sellerId: null as number | null,
      orderRemark: '',
      rows: [this.emptyRow()]
    };
  }

  private emptyRow(): OrderRow {
    return {
      subcategoryId: null,
      productId: null,
      quantity: null,
      mrp: null,
      gst: null,
      taxAmount: null,
      lineTotal: null,
      products: [],
      loadingProducts: false
    };
  }

  private get safeShowEntries(): number {
    const value = Number(this.showEntries);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 10;
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
}
