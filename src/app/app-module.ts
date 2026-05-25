import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';

// Shared Components
import { HeaderComponent } from './shared/components/header/header.component';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { SearchableSelectComponent } from './shared/components/searchable-select/searchable-select.component';

// Layout
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

// Pages
import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { RetailersComponent } from './pages/retailers/retailers.component';
import { RetailerCreateComponent } from './pages/retailers/retailer-create/retailer-create.component';
import { CategoriesComponent } from './pages/categories/categories.component';
import { DistributorsComponent } from './pages/distributors/distributors.component';
import { RolesComponent } from './pages/roles/roles.component';
import { UsersComponent } from './pages/users/users.component';
import { CustomersComponent } from './pages/customers/customers.component';
import { MasterCrudComponent } from './pages/master-crud/master-crud.component';
import { AddressMasterComponent } from './pages/address-master/address-master.component';
import { ForbiddenComponent } from './pages/forbidden/forbidden';

@NgModule({
  declarations: [
    App,
    HeaderComponent,
    SidebarComponent,
    SearchableSelectComponent,
    MainLayoutComponent,
    LoginComponent,
    DashboardComponent,
    RetailersComponent,
    RetailerCreateComponent,
    CategoriesComponent,
    DistributorsComponent,
    RolesComponent,
    UsersComponent,
    CustomersComponent,
    MasterCrudComponent,
    AddressMasterComponent,
    ForbiddenComponent,
  ],
  imports: [BrowserModule, CommonModule, FormsModule, ReactiveFormsModule, AppRoutingModule],
  providers: [provideHttpClient()],
  bootstrap: [App],
})
export class AppModule {}
