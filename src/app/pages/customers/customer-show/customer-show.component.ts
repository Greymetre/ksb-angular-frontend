import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, timeout } from 'rxjs/operators';
import { AuthService } from '../../../services/auth.service';
import { CustomerItem, CustomerService } from '../../../services/customer.service';
import { NewInvoiceItem, NewInvoiceService } from '../../../services/new-invoice.service';
import { RedemptionItem, RedemptionService } from '../../../services/redemption.service';

interface InfoRow {
  label: string;
  value: string | null | undefined;
}

interface PointCard {
  label: string;
  value: number;
  tone: 'primary' | 'success' | 'danger' | 'info';
}

interface TabItem {
  id: string;
  label: string;
  icon: string;
}

interface KycDocument {
  key: string;
  label: string;
  url: string;
  status: 'pending' | 'approved' | 'rejected';
  remark: string;
  actionBy: string;
  actionAt: string;
}

interface KycDialogModel {
  visible: boolean;
  action: 'approve' | 'reject' | null;
  document: KycDocument | null;
  remark: string;
}

@Component({
  standalone: false,
  selector: 'app-customer-show',
  templateUrl: './customer-show.component.html',
  styleUrls: ['./customer-show.component.scss']
})
export class CustomerShowComponent implements OnInit {
  customer: CustomerItem | null = null;
  invoices: NewInvoiceItem[] = [];
  redemptions: RedemptionItem[] = [];
  loading = false;
  loadingTransactions = false;
  loadingRedemptions = false;
  errorMessage = '';
  activeTab = 'details';
  transactionSchemeTag: 'Regular' | 'Booster' = 'Regular';
  redemptionWallet: 'Regular' | 'Booster' = 'Regular';
  selectedKycDocument: KycDocument | null = null;
  kycDialog: KycDialogModel = this.emptyKycDialog();
  savingKyc = false;
  toast = { visible: false, message: '', type: 'success' as 'success' | 'error' };
  private readonly backendOrigin = this.resolveBackendOrigin();
  private toastTimeoutId?: number;

  readonly tabs: TabItem[] = [
    { id: 'details', label: 'Details', icon: 'preview' },
    { id: 'orders', label: 'Orders', icon: 'add_shopping_cart' },
    { id: 'sales', label: 'Sales', icon: 'shopping_bag' },
    { id: 'payments', label: 'Payments', icon: 'currency_rupee' },
    { id: 'activity', label: 'Activity', icon: 'add_task' },
    { id: 'kyc', label: 'KYC', icon: 'verified' },
    { id: 'transaction', label: 'Transaction', icon: 'payment' },
    { id: 'redemption', label: 'Redemption', icon: 'account_balance_wallet' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private customerService: CustomerService,
    private newInvoiceService: NewInvoiceService,
    private redemptionService: RedemptionService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id) || id <= 0) {
      this.errorMessage = 'Customer not found.';
      return;
    }
    this.loadCustomer(id);
  }

  get displayName(): string {
    if (!this.customer) return '';
    return this.field('legal_name') || this.field('shop_name') || this.field('owner_name') || this.customer.name;
  }

  get imageUrl(): string {
    if (!this.customer) return '/assets/img/images-placeholder.png';
    return this.mediaUrl(this.field('shop_photo') || this.customer.shopImage || this.field('shop_image') || this.customer.profileImage || this.field('profile_image')) || '/assets/img/images-placeholder.png';
  }

  get pointCards(): PointCard[] {
    return [
      { label: 'Total Points', value: this.customer?.totalPoints || 0, tone: 'primary' },
      { label: 'Total Regular Points', value: this.customer?.totalRegularPoints || 0, tone: 'primary' },
      { label: 'Total Booster Points', value: this.customer?.totalBoosterPoints || 0, tone: 'primary' },
      { label: 'Total Redeem Point', value: this.customer?.totalRedeemPoints || 0, tone: 'success' },
      { label: 'Total Rejected Point', value: this.customer?.totalRejectedPoints || 0, tone: 'danger' },
      { label: 'Total Balance Point', value: this.customer?.totalBalancePoints || 0, tone: 'info' }
    ];
  }

  get personalRows(): InfoRow[] {
    if (!this.customer) return [];
    return this.presentRows([
      { label: 'Full Name', value: [this.field('first_name'), this.field('last_name')].filter(Boolean).join(' ') || this.customer.name },
      { label: 'Owner Name', value: this.field('owner_name') },
      { label: 'Mobile', value: this.customer.mobile || this.field('mobile_number') || this.field('mobile_numbers') },
      { label: 'WhatsApp / Alternate', value: this.customer.contactNumber || this.field('whatsapp_number') || this.field('alternate_mobile') },
      { label: 'Email', value: this.customer.email },
      { label: 'Gender', value: this.field('gender') }
    ]);
  }

  get addressRows(): InfoRow[] {
    if (!this.customer) return [];
    return this.presentRows([
      { label: 'Address', value: this.field('address1') || this.field('address_line') },
      { label: 'Shipping Address', value: this.field('shipping_address') },
      { label: 'Country', value: this.customer.countryName },
      { label: 'State', value: this.customer.stateName },
      { label: 'District', value: this.customer.districtName },
      { label: 'City', value: this.customer.cityName },
      { label: 'Pincode', value: this.customer.pincode },
      { label: 'Market', value: this.field('belt_area_market_name') },
      { label: 'GPS Location', value: this.field('gps_location') }
    ]);
  }

  get customerRows(): InfoRow[] {
    if (!this.customer) return [];
    return this.presentRows([
      { label: 'Customer Type', value: this.customer.customerTypeName },
      { label: 'Customer Code', value: this.customer.customerCode || this.field('distributor_code') },
      { label: 'Shop Name', value: this.field('shop_name') },
      { label: 'Trade / Business Name', value: this.field('trade_name') },
      { label: 'Parent', value: this.customer.parentName },
      { label: 'Distributor', value: this.lookupName('distributor_name') },
      { label: 'Agri Distributor', value: this.lookupName('agri_distributor') },
      { label: 'Beat', value: this.field('beat_id') || this.field('beat_route') },
      { label: 'Manager Name', value: this.field('manager_name') },
      { label: 'Manager Phone', value: this.field('manager_phone') },
      { label: 'Created By', value: this.customer.createdByName || this.customer.createdBy?.toString() },
      { label: 'Created At', value: this.formatDate(this.customer.createdAt) }
    ]);
  }

  get complianceRows(): InfoRow[] {
    return this.presentRows([
      { label: 'GST Number', value: this.field('gst_number') || this.field('gstin_no') },
      { label: 'PAN Number', value: this.field('pan_number') || this.field('pan_no') },
      { label: 'Aadhar No', value: this.field('aadhar_no') },
      { label: 'Registration Type', value: this.field('registration_type') },
      { label: 'Business Status', value: this.field('business_status') },
      { label: 'Business Start Date', value: this.field('business_start_date') },
      { label: 'Customer Segment', value: this.field('customer_segment') }
    ]);
  }

  get bankRows(): InfoRow[] {
    return this.presentRows([
      { label: 'Bank Account Type', value: this.field('bank_account_type') },
      { label: 'Bank Name', value: this.field('bank_name') },
      { label: 'Account Number', value: this.maskAccount(this.field('bank_account_number')) },
      { label: 'IFSC Code', value: this.field('ifsc_code') },
      { label: 'Account Holder Name', value: this.field('account_holder_name') }
    ]);
  }

  get kycDocuments(): KycDocument[] {
    return [
      this.kycDocument('gst', 'GST', this.firstField('gst_attachment', 'gst_image')),
      this.kycDocument('pan', 'PAN', this.firstField('pan_attachment', 'pan_image')),
      this.kycDocument('aadhar', 'Aadhaar Card', this.firstField('aadhar_attachment', 'aadhaar_attachment', 'adharcard')),
      this.kycDocument('bank', 'Blank Cheque / Passbook', this.firstField('bank_proof', 'blank_cheque', 'passbook'))
    ].filter(document => !!document.url);
  }

  get canApproveKyc(): boolean {
    return this.authService.hasAnyPermission(['customer_kyc_access', 'customer_edit']);
  }

  get customRows(): InfoRow[] {
    if (!this.customer) return [];
    const visibleKeys = new Set([
      'legal_name', 'shop_name', 'owner_name', 'mobile_numbers', 'address1', 'address_line',
      'shipping_address', 'gst_number', 'pan_number', 'bank_account_number', 'profile_image',
      'shop_image', 'shop_photo', 'gst_attachment', 'pan_attachment', 'aadhar_attachment', 'aadhaar_attachment',
      'adharcard', 'bank_proof', 'blank_cheque', 'passbook', 'mou_file',
      'documents', 'country_id', 'state_id', 'district_id', 'city_id', 'pincode_id'
    ]);
    return Object.entries(this.customer.customFields)
      .filter(([key, value]) => !visibleKeys.has(key) && !!value)
      .map(([key, value]) => ({ label: this.titleCase(key), value }));
  }

  get filteredInvoices(): NewInvoiceItem[] {
    return this.invoices.filter(invoice => this.schemeTag(invoice) === this.transactionSchemeTag);
  }

  get filteredRedemptions(): RedemptionItem[] {
    return this.redemptions.filter(redemption => (redemption.walletType || 'Regular').toLowerCase() === this.redemptionWallet.toLowerCase());
  }

  loadCustomer(id: number): void {
    this.loading = true;
    this.errorMessage = '';
    this.customerService.get(id).pipe(
      timeout(20000),
      finalize(() => {
        this.loading = false;
        this.refreshView();
      })
    ).subscribe({
      next: customer => {
        this.customer = customer;
        this.loadTransactions();
        this.loadRedemptions();
        this.refreshView();
      },
      error: error => {
        this.errorMessage = error.name === 'TimeoutError' ? 'Customer API request timed out.' : error.message;
        this.refreshView();
      }
    });
  }

  backToList(): void {
    this.router.navigate(['/customers']);
  }

  setTab(tab: string): void {
    this.activeTab = tab;
  }

  setTransactionSchemeTag(tag: 'Regular' | 'Booster'): void {
    this.transactionSchemeTag = tag;
  }

  setRedemptionWallet(wallet: 'Regular' | 'Booster'): void {
    this.redemptionWallet = wallet;
  }

  loadTransactions(): void {
    if (!this.customer) return;
    this.loadingTransactions = true;
    this.newInvoiceService.list({}).pipe(
      finalize(() => {
        this.loadingTransactions = false;
        this.refreshView();
      })
    ).subscribe({
      next: result => this.invoices = result.invoices.filter(invoice => invoice.secondaryCustomerId === this.customer?.id),
      error: error => this.showToast(error.message, 'error')
    });
  }

  loadRedemptions(): void {
    if (!this.customer) return;
    this.loadingRedemptions = true;
    this.redemptionService.list({}).pipe(
      finalize(() => {
        this.loadingRedemptions = false;
        this.refreshView();
      })
    ).subscribe({
      next: result => this.redemptions = result.redemptions.filter(redemption => redemption.customerId === this.customer?.id),
      error: error => this.showToast(error.message, 'error')
    });
  }

  openKycPreview(document: KycDocument): void {
    this.selectedKycDocument = document;
    this.refreshView();
  }

  closeKycPreview(): void {
    this.selectedKycDocument = null;
    this.refreshView();
  }

  openKycDialog(document: KycDocument, action: 'approve' | 'reject'): void {
    this.kycDialog = { visible: true, document, action, remark: action === 'reject' ? document.remark : '' };
    this.refreshView();
  }

  closeKycDialog(): void {
    if (this.savingKyc) return;
    this.kycDialog = this.emptyKycDialog();
    this.refreshView();
  }

  submitKycAction(): void {
    if (!this.customer || !this.kycDialog.document || !this.kycDialog.action) return;
    if (this.kycDialog.action === 'reject' && !this.kycDialog.remark.trim()) {
      this.showToast('Remark is required to reject KYC.', 'error');
      return;
    }

    const request = this.kycDialog.action === 'approve'
      ? this.customerService.approveKyc(this.customer.id, this.kycDialog.document.key, this.kycDialog.remark)
      : this.customerService.rejectKyc(this.customer.id, this.kycDialog.document.key, this.kycDialog.remark);

    this.savingKyc = true;
    request.pipe(finalize(() => {
      this.savingKyc = false;
      this.refreshView();
    })).subscribe({
      next: result => {
        if (result.item) this.customer = result.item;
        this.kycDialog = this.emptyKycDialog();
        this.showToast(result.message, 'success');
        this.refreshView();
      },
      error: error => this.showToast(error.message, 'error')
    });
  }

  field(key: string): string {
    return this.customer?.customFields?.[key] || '';
  }

  firstField(...keys: string[]): string {
    return keys.map(key => this.field(key)).find(value => !!value) || '';
  }

  mediaUrl(value?: string | null): string {
    if (!value) return '';
    const path = value.trim();
    if (!path) return '';
    if (/^(https?:)?\/\//i.test(path) || path.startsWith('data:') || path.startsWith('blob:')) return path;
    if (path.startsWith('/assets/')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.backendOrigin}${cleanPath}`;
  }

  formatDate(value?: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  formatShortDate(value?: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  statusClass(status: number): string {
    return `status-${status}`;
  }

  redemptionStatusClass(status: number): string {
    return `redemption-status-${status}`;
  }

  activeTabIcon(): string {
    return this.tabs.find(tab => tab.id === this.activeTab)?.icon || 'info';
  }

  statusLabel(status: KycDocument['status']): string {
    if (status === 'approved') return 'Approved';
    if (status === 'rejected') return 'Rejected';
    return 'Pending';
  }

  kycDialogTitle(): string {
    if (!this.kycDialog.document || !this.kycDialog.action) return 'KYC Approval';
    return `${this.kycDialog.action === 'approve' ? 'Approve' : 'Reject'} ${this.kycDialog.document.label}`;
  }

  private kycDocument(key: string, label: string, path: string): KycDocument {
    const prefix = `${key}_kyc`;
    return {
      key,
      label,
      url: this.mediaUrl(path),
      status: this.kycStatus(this.field(`${prefix}_status`)),
      remark: this.field(`${prefix}_remark`),
      actionBy: this.field(`${prefix}_action_by_name`) || this.field(`${prefix}_action_by`),
      actionAt: this.field(`${prefix}_action_at`)
    };
  }

  private kycStatus(value: string): KycDocument['status'] {
    const status = value.toLowerCase();
    return status === 'approved' || status === 'rejected' ? status : 'pending';
  }

  private schemeTag(invoice: NewInvoiceItem): 'Regular' | 'Booster' {
    return (invoice.schemeTag || '').toLowerCase() === 'booster' ? 'Booster' : 'Regular';
  }

  private numberField(key: string): number {
    const value = Number(this.field(key));
    return Number.isFinite(value) ? value : 0;
  }

  private emptyKycDialog(): KycDialogModel {
    return { visible: false, action: null, document: null, remark: '' };
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

  private lookupName(key: string): string {
    const nameKey = `${key}_name`;
    return this.field(nameKey) || this.field(key);
  }

  private maskAccount(value: string): string {
    if (!value) return '';
    return value.length <= 4 ? value : `${'*'.repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
  }

  private presentRows(rows: InfoRow[]): InfoRow[] {
    return rows.filter(row => row.value !== null && row.value !== undefined && String(row.value).trim() !== '');
  }

  private titleCase(key: string): string {
    return key.replace(/_/g, ' ').replace(/\w\S*/g, text => text.charAt(0).toUpperCase() + text.slice(1).toLowerCase());
  }

  private refreshView(): void {
    this.cdr.detectChanges();
  }

  private resolveBackendOrigin(): string {
    const { protocol, hostname, port } = window.location;
    if (port === '4200') return `${protocol}//${hostname === 'localhost' ? '127.0.0.1' : hostname}:5172`;
    return window.location.origin;
  }
}
