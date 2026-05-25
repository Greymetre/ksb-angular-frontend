import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  standalone: false,
  selector: 'app-retailer-create',
  templateUrl: './retailer-create.component.html',
  styleUrls: ['./retailer-create.component.scss']
})
export class RetailerCreateComponent {
  form: FormGroup;

  distributors = ['Sharma Distributors', 'Gupta Enterprises', 'Mehta Trading Co.'];
  agriDistributors = ['Agri Corp India', 'Green Fields Pvt Ltd', 'Kisan Agro'];
  beats = ['City Beat', 'Rural Beat', 'Dummy Beat', 'North Beat', 'South Beat'];
  states = ['Madhya Pradesh', 'Uttar Pradesh', 'Maharashtra', 'Rajasthan', 'Karnataka'];
  districts = ['Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Morena'];
  bankAccountTypes = ['Savings', 'Current', 'Fixed Deposit'];

  constructor(private fb: FormBuilder, private router: Router) {
    this.form = this.fb.group({
      shopName: ['', Validators.required],
      ownerName: ['', Validators.required],
      mobileNumbers: this.fb.array([this.fb.control('', Validators.required)]),
      distributorName: ['', Validators.required],
      agriDistributor: ['', Validators.required],
      selectEmployee: ['', Validators.required],
      beat: ['', Validators.required],
      addressLine: ['', Validators.required],
      state: ['', Validators.required],
      district: [''],
      pincode: ['', Validators.required],
      beltAreaMarketName: [''],
      gstNumber: [''],
      panNumber: [''],
      bankAccountType: [''],
      bankName: [''],
      bankAccountNumber: [''],
      confirmBankAccountNumber: [''],
      ifscCode: [''],
      accountHolderName: ['']
    });
  }

  get mobileNumbers() { return this.form.get('mobileNumbers') as FormArray; }
  addMobile() {
    if (this.mobileNumbers.length < 5) this.mobileNumbers.push(this.fb.control(''));
  }
  removeMobile(i: number) {
    if (this.mobileNumbers.length > 1) this.mobileNumbers.removeAt(i);
  }

  submit() {
    if (this.form.valid) {
      console.log(this.form.value);
      this.router.navigate(['/retailers']);
    }
  }
  cancel() { this.router.navigate(['/retailers']); }
}
