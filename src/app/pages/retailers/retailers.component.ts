import { Component } from '@angular/core';
import { Router } from '@angular/router';

export interface Retailer {
  id: number;
  ownerName: string;
  shopName: string;
  mobile: string;
  beat: string;
  state: string;
  district: string;
  status: 'PENDING' | 'APPROVED';
  active: boolean;
  createdAt: string;
}

@Component({
  standalone: false,
  selector: 'app-retailers',
  templateUrl: './retailers.component.html',
  styleUrls: ['./retailers.component.scss']
})
export class RetailersComponent {
  showFilter = false;
  searchQuery = '';
  appliedSearchQuery = '';
  private searchTimeoutId?: number;

  filterForm = {
    ownerName: 'All Owners',
    shopName: 'All Shops',
    mobileNumber: 'All Mobiles',
    beat: 'All Beats',
    state: 'All States',
    city: 'All Cities',
    status: 'All',
    active: 'All',
    designation: 'ASR, DSR',
    startDate: '',
    endDate: ''
  };

  retailers: Retailer[] = [
    { id: 1, ownerName: 'Ankit Tiwri', shopName: 'Shri Ram Traders', mobile: '9120641717', beat: 'Dummy Beat', state: 'Uttar Pradesh', district: 'Deoria', status: 'PENDING', active: true, createdAt: '2024-01-15' },
    { id: 2, ownerName: 'Raghavendra', shopName: 'Jayanthi Agencies', mobile: '9848485289', beat: 'Dummy Beat', state: 'Andhra Pradesh', district: 'Kurnool', status: 'PENDING', active: true, createdAt: '2024-01-14' },
    { id: 3, ownerName: 'Koshal Kumar', shopName: 'Koshal Trading Company', mobile: '9827259752', beat: 'Dummy Beat', state: 'Madhya Pradesh', district: 'Morena', status: 'PENDING', active: true, createdAt: '2024-01-13' },
    { id: 4, ownerName: 'Chaugle', shopName: 'Mangalmurti Traders', mobile: '9423605913', beat: 'Dummy Beat', state: 'Karnataka', district: 'Belgaum', status: 'PENDING', active: true, createdAt: '2024-01-12' },
    { id: 5, ownerName: 'G S Rathore', shopName: 'G S Machinery Store', mobile: '9826548850', beat: 'Dummy Beat', state: 'Madhya Pradesh', district: 'Morena', status: 'PENDING', active: true, createdAt: '2024-01-11' },
    { id: 6, ownerName: 'Paras', shopName: 'Saini Traders', mobile: '8859073043', beat: 'Dummy Beat', state: 'Uttarakhand', district: 'Haridwar', status: 'PENDING', active: true, createdAt: '2024-01-10' },
    { id: 7, ownerName: 'VISHAL KOTHALE', shopName: 'SHREE VISHAL TRADING COMPANY', mobile: '7709591359', beat: 'Dummy Beat', state: 'Maharashtra', district: 'Nagpur', status: 'PENDING', active: true, createdAt: '2024-01-09' },
    { id: 8, ownerName: 'Rahul Sharma', shopName: 'Sharma General Store', mobile: '9812345678', beat: 'Dummy Beat', state: 'Rajasthan', district: 'Jaipur', status: 'PENDING', active: false, createdAt: '2024-01-08' },
    { id: 9, ownerName: 'Priya Singh', shopName: 'Singh Electronics', mobile: '9876543210', beat: 'City Beat', state: 'Delhi', district: 'New Delhi', status: 'PENDING', active: true, createdAt: '2024-01-07' },
    { id: 10, ownerName: 'Mohan Lal', shopName: 'Lal Kirana Store', mobile: '9765432101', beat: 'Rural Beat', state: 'Punjab', district: 'Ludhiana', status: 'PENDING', active: true, createdAt: '2024-01-06' },
  ];

  get filteredRetailers() {
    if (!this.appliedSearchQuery) return this.retailers;
    const q = this.appliedSearchQuery.toLowerCase();
    return this.retailers.filter(r =>
      r.ownerName.toLowerCase().includes(q) ||
      r.shopName.toLowerCase().includes(q) ||
      r.mobile.includes(q) ||
      r.state.toLowerCase().includes(q)
    );
  }

  toggleFilter() { this.showFilter = !this.showFilter; }
  scheduleSearch() {
    if (this.searchTimeoutId) window.clearTimeout(this.searchTimeoutId);
    this.searchTimeoutId = window.setTimeout(() => {
      this.appliedSearchQuery = this.searchQuery;
    }, 400);
  }
  toggleActive(r: Retailer) { r.active = !r.active; }

  constructor(private router: Router) {}
  addNew() { this.router.navigate(['/retailers/create']); }
  editRetailer(r: Retailer) { console.log('edit', r.id); }
  viewRetailer(r: Retailer) { console.log('view', r.id); }
  deleteRetailer(r: Retailer) { this.retailers = this.retailers.filter(x => x.id !== r.id); }
  assignRetailer(r: Retailer) { console.log('assign', r.id); }
}
