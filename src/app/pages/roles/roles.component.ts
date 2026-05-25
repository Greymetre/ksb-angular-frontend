import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { timeout } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { Permission, Role, RolePayload, RoleService } from '../../services/role.service';

interface RoleFormModel {
  id: number | null;
  name: string;
  guard_name: string;
  permissions: number[];
}

interface ToastModel {
  visible: boolean;
  message: string;
  type: 'success' | 'error';
}

@Component({
  standalone: false,
  selector: 'app-roles',
  templateUrl: './roles.component.html',
  styleUrls: ['./roles.component.scss']
})
export class RolesComponent implements OnInit {
  roles: Role[] = [];
  permissions: Permission[] = [];
  showEntries = 10;
  searchQuery = '';
  permissionSearch = '';
  showRoleModal = false;
  permissionDropdownOpen = false;
  permissionDropdownSearch = '';
  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';
  toast: ToastModel = { visible: false, message: '', type: 'success' };
  roleForm: RoleFormModel = this.emptyForm();
  private toastTimeoutId?: number;

  constructor(
    private roleService: RoleService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  get filteredRoles(): Role[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.roles;

    return this.roles.filter(role =>
      (role.name ?? '').toLowerCase().includes(q)
      || (role.guard_name ?? '').toLowerCase().includes(q)
    );
  }

  get pagedRoles(): Role[] {
    return this.filteredRoles.slice(0, this.showEntries);
  }

  get filteredPermissions(): Permission[] {
    const q = this.permissionSearch.trim().toLowerCase();
    if (!q) return this.permissions;

    return this.permissions.filter(permission =>
      (permission.name ?? '').toLowerCase().includes(q)
      || (permission.guard_name ?? '').toLowerCase().includes(q)
    );
  }

  get filteredModalPermissions(): Permission[] {
    const q = this.permissionDropdownSearch.trim().toLowerCase();
    if (!q) return this.permissions;

    return this.permissions.filter(permission =>
      (permission.name ?? '').toLowerCase().includes(q)
      || (permission.guard_name ?? '').toLowerCase().includes(q)
    );
  }

  get selectedModalPermissions(): Permission[] {
    const selected = new Set(this.roleForm.permissions);
    return this.permissions.filter(permission => selected.has(permission.id));
  }

  get selectedPermissionLabel(): string {
    const count = this.roleForm.permissions.length;
    if (count === 0) return 'Select permissions';
    if (count === 1) return this.selectedModalPermissions[0]?.name ?? '1 permission selected';
    return `${count} permissions selected`;
  }

  get canCreate(): boolean {
    return this.authService.hasPermission('role_create');
  }

  get canEdit(): boolean {
    return this.authService.hasPermission('role_edit');
  }

  get canDelete(): boolean {
    return this.authService.hasPermission('role_delete');
  }

  loadData(): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.roles = [];
    this.permissions = [];

    this.loadPermissions();
    this.loadRoles();
    this.refreshView();
  }

  loadRoles(): void {
    this.loading = true;
    this.roleService.getRoles('', true).pipe(
      timeout(15000),
      finalize(() => {
        this.loading = false;
        this.refreshView();
      })
    ).subscribe({
      next: roles => {
        this.roles = roles;
        if (roles.length === 0) {
          this.errorMessage = 'Roles API returned 200, but no roles were found in the response.';
        }
        this.refreshView();
      },
      error: error => {
        this.errorMessage = error.name === 'TimeoutError'
          ? 'Roles API request timed out. Please check the frontend proxy/backend URL.'
          : error.message;
        this.refreshView();
      }
    });
  }

  loadPermissions(): void {
    this.roleService.getPermissions().pipe(
      timeout(15000)
    ).subscribe({
      next: permissions => {
        this.permissions = permissions;
        if (permissions.length === 0) {
          this.errorMessage = 'Permissions API returned 200, but no permissions were found in the response.';
        }
        this.refreshView();
      },
      error: error => {
        this.errorMessage = error.name === 'TimeoutError'
          ? 'Permissions API request timed out. Please check the frontend proxy/backend URL.'
          : error.message;
        this.refreshView();
      }
    });
  }

  openCreateModal(): void {
    this.roleForm = this.emptyForm();
    this.permissionDropdownOpen = false;
    this.permissionDropdownSearch = '';
    this.showRoleModal = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  openEditModal(role: Role): void {
    this.roleForm = {
      id: role.id,
      name: role.name,
      guard_name: role.guard_name || 'users',
      permissions: (role.permissions ?? []).map(permission => permission.id)
    };
    this.permissionDropdownOpen = false;
    this.permissionDropdownSearch = '';
    this.showRoleModal = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeRoleModal(): void {
    if (this.saving) return;
    this.showRoleModal = false;
    this.permissionDropdownOpen = false;
  }

  submitRole(): void {
    const name = this.roleForm.name.trim();
    if (!name) {
      this.errorMessage = 'Role name is required.';
      return;
    }

    const payload: RolePayload = {
      name,
      guard_name: this.roleForm.guard_name.trim() || 'users',
      permissions: this.roleForm.permissions
    };

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const request = this.roleForm.id
      ? this.roleService.updateRole(this.roleForm.id, payload)
      : this.roleService.createRole(payload);

    request.subscribe({
      next: result => this.handleRoleSaved(result.message),
      error: error => {
        this.saving = false;
        this.showToast(error.message, 'error');
        this.refreshView();
      }
    });
  }

  private handleRoleSaved(resultMessage: string): void {
    this.saving = false;
    this.showRoleModal = false;
    this.permissionDropdownOpen = false;
    this.roleForm = this.emptyForm();
    this.showToast(resultMessage || 'Role saved successfully', 'success');
    this.loadData();
    this.refreshView();
  }

  deleteRole(role: Role): void {
    if (!confirm(`Delete role "${role.name}"?`)) return;

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.roleService.deleteRole(role.id).subscribe({
      next: result => {
        this.showToast(result.message, 'success');
        this.loadData();
        this.refreshView();
      },
      error: error => {
        this.loading = false;
        this.showToast(error.message, 'error');
        this.refreshView();
      }
    });
  }

  toggleFormPermission(permissionId: number, event: Event): void {
    const checked = event.target instanceof HTMLInputElement ? event.target.checked : false;
    const current = new Set(this.roleForm.permissions);

    if (checked) {
      current.add(permissionId);
    } else {
      current.delete(permissionId);
    }

    this.roleForm.permissions = Array.from(current);
  }

  toggleDropdownPermission(permissionId: number): void {
    const current = new Set(this.roleForm.permissions);
    if (current.has(permissionId)) {
      current.delete(permissionId);
    } else {
      current.add(permissionId);
    }

    this.roleForm.permissions = Array.from(current);
  }

  removeFormPermission(permissionId: number): void {
    this.roleForm.permissions = this.roleForm.permissions.filter(id => id !== permissionId);
  }

  clearFormPermissions(): void {
    this.roleForm.permissions = [];
  }

  selectAllFormPermissions(): void {
    this.roleForm.permissions = this.permissions.map(permission => permission.id);
  }

  formHasPermission(permissionId: number): boolean {
    return this.roleForm.permissions.includes(permissionId);
  }

  formatDate(value?: string | null): string {
    if (!value) return '';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  readableName(value: string): string {
    return (value || '')
      .replace(/[_-]/g, ' ')
      .replace(/\w\S*/g, word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  }

  permissionSummary(role: Role): string {
    const permissions = role.permissions ?? [];
    if (!permissions.length) return 'No permissions';
    if (permissions.length <= 2) return permissions.map(permission => permission.name).join(', ');
    return `${permissions[0].name}, ${permissions[1].name} +${permissions.length - 2}`;
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    if (!message) return;

    this.toast = { visible: true, message, type };
    if (this.toastTimeoutId) {
      window.clearTimeout(this.toastTimeoutId);
    }

    this.toastTimeoutId = window.setTimeout(() => {
      this.toast = { ...this.toast, visible: false };
      this.refreshView();
    }, 3500);
    this.refreshView();
  }

  private refreshView(): void {
    this.cdr.detectChanges();
  }

  private emptyForm(): RoleFormModel {
    return {
      id: null,
      name: '',
      guard_name: 'users',
      permissions: []
    };
  }
}
