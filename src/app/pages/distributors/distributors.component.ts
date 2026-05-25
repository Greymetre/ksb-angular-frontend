import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  standalone: false,
  selector: 'app-distributors',
  templateUrl: './distributors.component.html',
  styleUrls: ['./distributors.component.scss']
})
export class DistributorsComponent {
  searchQuery = '';
  distributors = [
    { id: 1, ownerName: 'Ramesh Agarwal', shopName: 'Agarwal Distributors', mobile: '9812345678', beat: 'City Beat', state: 'Madhya Pradesh', district: 'Indore', status: 'PENDING', active: true },
    { id: 2, ownerName: 'Suresh Gupta', shopName: 'Gupta Enterprises', mobile: '9876543210', beat: 'Rural Beat', state: 'Uttar Pradesh', district: 'Lucknow', status: 'PENDING', active: true },
    { id: 3, ownerName: 'Mahesh Patel', shopName: 'Patel Trading Co.', mobile: '9765432109', beat: 'North Beat', state: 'Gujarat', district: 'Ahmedabad', status: 'PENDING', active: false },
  ];
  constructor(private router: Router) {}
  get filtered() {
    if (!this.searchQuery) return this.distributors;
    const q = this.searchQuery.toLowerCase();
    return this.distributors.filter(d => d.ownerName.toLowerCase().includes(q) || d.shopName.toLowerCase().includes(q));
  }
  toggleActive(d: any) { d.active = !d.active; }
  deleteDistributor(d: any) { this.distributors = this.distributors.filter(x => x.id !== d.id); }
}
