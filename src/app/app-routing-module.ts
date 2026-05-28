import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { RetailersComponent } from './pages/retailers/retailers.component';
import { RetailerCreateComponent } from './pages/retailers/retailer-create/retailer-create.component';
import { CategoriesComponent } from './pages/categories/categories.component';
import { ProductMasterComponent } from './pages/product-master/product-master.component';
import { DistributorsComponent } from './pages/distributors/distributors.component';
import { RolesComponent } from './pages/roles/roles.component';
import { UsersComponent } from './pages/users/users.component';
import { CustomersComponent } from './pages/customers/customers.component';
import { CustomerShowComponent } from './pages/customers/customer-show/customer-show.component';
import { LoyaltySchemesComponent } from './pages/loyalty-schemes/loyalty-schemes.component';
import { NewInvoicesComponent } from './pages/new-invoices/new-invoices.component';
import { MasterCrudComponent } from './pages/master-crud/master-crud.component';
import { AddressMasterComponent } from './pages/address-master/address-master.component';
import { authGuard } from './guards/auth-guard';
import { ForbiddenComponent } from './pages/forbidden/forbidden';

const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: 'forbidden',
        component: ForbiddenComponent
      },
      { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard], data: { permission: 'dashboard_access' } },
      { path: 'retailers', component: RetailersComponent, canActivate: [authGuard], data: { permission: 'retailer_view' } },
      { path: 'retailers/create', component: RetailerCreateComponent, canActivate: [authGuard], data: { permission: 'retailer_create' } },
      { path: 'distributors', component: DistributorsComponent, canActivate: [authGuard], data: { permission: 'distributor_view' } },
      { path: 'categories', redirectTo: '/segments' },
      { path: 'segments', component: ProductMasterComponent, canActivate: [authGuard], data: { permission: 'category_access', productMode: 'segment' } },
      { path: 'families', component: ProductMasterComponent, canActivate: [authGuard], data: { permission: 'subcategory_access', productMode: 'family' } },
      { path: 'subcategories', redirectTo: '/families' },
      { path: 'products', component: ProductMasterComponent, canActivate: [authGuard], data: { permission: 'product_access', productMode: 'product' } },
      { path: 'roles', component: RolesComponent, canActivate: [authGuard], data: { permission: 'role_view' } },
      { path: 'users', component: UsersComponent, canActivate: [authGuard], data: { permission: 'user_view' } },
      { path: 'customers', component: CustomersComponent, canActivate: [authGuard], data: { permission: 'customer_access' } },
      { path: 'customers/:id', component: CustomerShowComponent, canActivate: [authGuard], data: { permission: 'customer_access' } },
      { path: 'new-invoices', component: NewInvoicesComponent, canActivate: [authGuard], data: { permission: 'new_invoice_access' } },
      { path: 'new-invoices/:id', component: NewInvoicesComponent, canActivate: [authGuard], data: { permission: 'new_invoice_access' } },
      { path: 'loyalty-schemes', component: LoyaltySchemesComponent, canActivate: [authGuard], data: { permission: 'scheme_access_list' } },
      {
        path: 'countries',
        component: AddressMasterComponent,
        canActivate: [authGuard],
        data: {
          permission: 'country_access',
          addressConfig: {
            title: 'CountryList',
            singular: 'Country',
            icon: 'flag_circle',
            permissionPrefix: 'country',
            path: 'countries',
            listKey: 'countries',
            itemKey: 'country',
            nameField: 'countryName',
            nameLabel: 'Country Name',
            fileName: 'countrys.xlsx'
          }
        }
      },
      {
        path: 'states',
        component: AddressMasterComponent,
        canActivate: [authGuard],
        data: {
          permission: 'state_access',
          addressConfig: {
            title: 'StateList',
            singular: 'State',
            icon: 'location_city',
            permissionPrefix: 'state',
            path: 'states',
            listKey: 'states',
            itemKey: 'state',
            nameField: 'stateName',
            nameLabel: 'State Name',
            fileName: 'states.xlsx',
            hasGstCode: true,
            parent: {
              field: 'countryId',
              label: 'Country',
              path: 'getcountry',
              key: 'countries',
              display: 'countryName'
            }
          }
        }
      },
      {
        path: 'districts',
        component: AddressMasterComponent,
        canActivate: [authGuard],
        data: {
          permission: 'district_access',
          addressConfig: {
            title: 'DistrictList',
            singular: 'District',
            icon: 'balcony',
            permissionPrefix: 'district',
            path: 'districts',
            listKey: 'districts',
            itemKey: 'district',
            nameField: 'districtName',
            nameLabel: 'District Name',
            fileName: 'districts.xlsx',
            parent: {
              field: 'stateId',
              label: 'State',
              path: 'getstate',
              key: 'states',
              display: 'stateName'
            }
          }
        }
      },
      {
        path: 'cities',
        component: AddressMasterComponent,
        canActivate: [authGuard],
        data: {
          permission: 'city_access',
          addressConfig: {
            title: 'CityList',
            singular: 'City',
            icon: 'apartment',
            permissionPrefix: 'city',
            path: 'cities',
            listKey: 'cities',
            itemKey: 'city',
            nameField: 'cityName',
            nameLabel: 'City Name',
            fileName: 'cities.xlsx',
            parent: {
              field: 'districtId',
              label: 'District',
              path: 'getdistrict',
              key: 'districts',
              display: 'districtName'
            }
          }
        }
      },
      {
        path: 'pincodes',
        component: AddressMasterComponent,
        canActivate: [authGuard],
        data: {
          permission: 'pincode_access',
          addressConfig: {
            title: 'PincodeList',
            singular: 'Pincode',
            icon: 'cabin',
            permissionPrefix: 'pincode',
            path: 'pincodes',
            listKey: 'pincodes',
            itemKey: 'pincode',
            nameField: 'pincode',
            nameLabel: 'Pincode',
            fileName: 'pincodes.xlsx',
            parent: {
              field: 'cityId',
              label: 'City',
              path: 'getcity',
              key: 'cities',
              display: 'cityName'
            }
          }
        }
      },
      {
        path: 'branches',
        component: MasterCrudComponent,
        canActivate: [authGuard],
        data: {
          masterConfig: {
            title: 'BranchList',
            singular: 'Branch',
            icon: 'holiday_village',
            permission: 'branch',
            exportPermission: 'branch_report_download',
            path: 'branches',
            listKey: 'branches',
            itemKey: 'branch',
            nameField: 'branchName',
            nameLabel: 'Branch Name',
            fileName: 'branch.xlsx',
            hasBranchCode: true,
            hasWarehouse: true
          }
        }
      },
      {
        path: 'divisions',
        component: MasterCrudComponent,
        canActivate: [authGuard],
        data: {
          masterConfig: {
            title: 'DivisionList',
            singular: 'Division',
            icon: 'safety_divider',
            permission: 'division',
            exportPermission: 'division_report_download',
            path: 'divisions',
            listKey: 'divisions',
            itemKey: 'division',
            nameField: 'divisionName',
            nameLabel: 'Division Name',
            fileName: 'divisions.xlsx'
          }
        }
      },
      {
        path: 'designations',
        component: MasterCrudComponent,
        canActivate: [authGuard],
        data: {
          masterConfig: {
            title: 'DesignationList',
            singular: 'Designation',
            icon: 'shopping_bag',
            permission: 'designation',
            path: 'designations',
            listKey: 'designations',
            itemKey: 'designation',
            nameField: 'designationName',
            nameLabel: 'Designation Name',
            fileName: 'designations.xlsx'
          }
        }
      },
      {
        path: 'departments',
        component: MasterCrudComponent,
        canActivate: [authGuard],
        data: {
          masterConfig: {
            title: 'DepartmentList',
            singular: 'Department',
            icon: 'local_fire_department',
            permission: 'departments',
            exportPermission: 'department_report_download',
            path: 'departments',
            listKey: 'departments',
            itemKey: 'department',
            nameField: 'name',
            nameLabel: 'Department Name',
            fileName: 'departments.xlsx'
          }
        }
      },
      { path: '**', redirectTo: '/dashboard' }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
