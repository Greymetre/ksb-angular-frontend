import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

interface LoginUserInfo {
  id: number;
  name?: string;
  email?: string;
  mobile?: string;
  access_token?: string;
  token?: string;
  provider?: string;
  roles?: number[];
  permissions?: string[];
  user_type?: string[];
}

interface LoginResponse {
  status: string;
  message?: unknown;
  userinfo?: LoginUserInfo;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly loginUrl = '/api/login';
  private readonly tokenKey = 'netproject_access_token';
  private readonly userKey = 'netproject_user';
  private readonly deviceKey = 'netproject_device_id';

  constructor(private http: HttpClient) {}

  login(username: string, password: string): Observable<LoginUserInfo> {
    return this.http.post<LoginResponse>(this.loginUrl, {
      username,
      password,
      unique_id: this.getDeviceId(),
      device_type: 'web',
      device_name: window.navigator.userAgent,
      app_version: 'netproject-frontend',
      login_at: new Date().toISOString()
    }).pipe(
      map(response => {
        const userinfo = response.userinfo;
        const token = userinfo?.access_token ?? userinfo?.token;

        if (response.status !== 'success' || !userinfo || !token) {
          throw new Error(this.readMessage(response.message) || 'Login failed. Please try again.');
        }

        localStorage.setItem(this.tokenKey, token);
        localStorage.setItem(this.userKey, JSON.stringify(userinfo));
        return userinfo;
      }),
      catchError(error => throwError(() => new Error(this.getErrorMessage(error))))
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getCurrentUser(): LoginUserInfo | null {
    const stored = localStorage.getItem(this.userKey);
    if (!stored) return null;

    try {
      return JSON.parse(stored) as LoginUserInfo;
    } catch {
      return null;
    }
  }

  hasPermission(permission?: string): boolean {
    if (!permission) return false;
    if (this.isSuperAdmin()) return true;

    const permissions = this.getCurrentUser()?.permissions;
    if (!permissions?.length) return false;

    return permissions.includes(permission);
  }

  hasAnyPermission(permissions?: string[]): boolean {
    if (!permissions?.length) return false;
    if (this.isSuperAdmin()) return true;

    const currentPermissions = this.getCurrentUser()?.permissions;
    if (!currentPermissions?.length) return false;

    return permissions.some(permission => currentPermissions.includes(permission));
  }

  private isSuperAdmin(): boolean {
    return this.getCurrentUser()?.user_type?.some(role =>
      role.toLowerCase() === 'superadmin'
    ) ?? false;
  }

  private getDeviceId(): string {
    const existing = localStorage.getItem(this.deviceKey);
    if (existing) return existing;

    const generated = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    localStorage.setItem(this.deviceKey, generated);
    return generated;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      return this.readMessage(error.error?.message) || error.message || 'Unable to reach login API.';
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Unable to reach login API.';
  }

  private readMessage(message: unknown): string {
    if (typeof message === 'string') return message;

    if (message && typeof message === 'object') {
      return Object.values(message)
        .flatMap(value => Array.isArray(value) ? value : [value])
        .filter((value): value is string => typeof value === 'string')
        .join(' ');
    }

    return '';
  }
}
