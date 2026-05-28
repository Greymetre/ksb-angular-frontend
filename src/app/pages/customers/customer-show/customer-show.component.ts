import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, timeout } from 'rxjs/operators';
import { CustomerItem, CustomerService } from '../../../services/customer.service';

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
  label: string;
  url: string;
}

@Component({
  standalone: false,
  selector: 'app-customer-show',
  templateUrl: './customer-show.component.html',
  styleUrls: ['./customer-show.component.scss']
})
export class CustomerShowComponent implements OnInit {
  customer: CustomerItem | null = null;
  loading = false;
  errorMessage = '';
  activeTab = 'details';
  selectedKycDocument: KycDocument | null = null;
  private readonly backendOrigin = this.resolveBackendOrigin();

  readonly tabs: TabItem[] = [
    { id: 'details', label: 'Details', icon: 'preview' },
    { id: 'orders', label: 'Orders', icon: 'add_shopping_cart' },
    { id: 'sales', label: 'Sales', icon: 'shopping_bag' },
    { id: 'payments', label: 'Payments', icon: 'currency_rupee' },
    { id: 'activity', label: 'Activity', icon: 'add_task' },
    { id: 'kyc', label: 'KYC', icon: 'verified' },
    { id: 'transaction', label: 'Transaction', icon: 'payment' },
    { id: 'gift', label: 'Gift Redemption', icon: 'redeem' },
    { id: 'neft', label: 'NEFT Redemption', icon: 'account_balance' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private customerService: CustomerService,
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
    if (!this.customer) return '/assets/img/placeholder.jpg';
    return this.mediaUrl(this.field('shop_photo') || this.customer.shopImage || this.field('shop_image') || this.customer.profileImage || this.field('profile_image')) || '/assets/img/placeholder.jpg';
  }

  get pointCards(): PointCard[] {
    return [
      { label: 'Total Point Earn', value: this.numberField('total_points'), tone: 'primary' },
      { label: 'Total Active Point', value: this.numberField('active_points'), tone: 'primary' },
      { label: 'Total Provision Point', value: this.numberField('provision_points'), tone: 'primary' },
      { label: 'Total Redeem Point', value: this.numberField('total_redemption'), tone: 'success' },
      { label: 'Total Rejected Point', value: this.numberField('total_rejected'), tone: 'danger' },
      { label: 'Total Balance Point', value: this.numberField('total_balance'), tone: 'info' }
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
      { label: 'GST', url: this.mediaUrl(this.firstField('gst_attachment', 'gst_image')) },
      { label: 'PAN', url: this.mediaUrl(this.firstField('pan_attachment', 'pan_image')) },
      { label: 'Aadhaar Card', url: this.mediaUrl(this.firstField('aadhar_attachment', 'aadhaar_attachment', 'adharcard')) },
      { label: 'Blank Cheque / Passbook', url: this.mediaUrl(this.firstField('bank_proof', 'blank_cheque', 'passbook')) }
    ].filter(document => !!document.url);
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

  openKycPreview(document: KycDocument): void {
    this.selectedKycDocument = document;
    this.refreshView();
  }

  closeKycPreview(): void {
    this.selectedKycDocument = null;
    this.refreshView();
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

  activeTabIcon(): string {
    return this.tabs.find(tab => tab.id === this.activeTab)?.icon || 'info';
  }

  private numberField(key: string): number {
    const value = Number(this.field(key));
    return Number.isFinite(value) ? value : 0;
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
