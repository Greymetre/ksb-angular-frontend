import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface NewInvoiceItem {
  id: number;
  secondaryCustomerId: number;
  retailerCode: string;
  customerName: string;
  shopName: string;
  mobileNumber: string;
  cityName?: string | null;
  zoneName?: string | null;
  invoiceNumber: string;
  invoiceDate: string;
  amount: number;
  points: number;
  approvalStatus: number;
  approvalStatusLabel: string;
  approvalRemark?: string | null;
  createdBy: number;
  createdByName?: string | null;
  createdAt?: string | null;
  approvalLogs: NewInvoiceApprovalLog[];
}

export interface NewInvoiceApprovalLog {
  id: number;
  logDate?: string | null;
  createdBy?: number | null;
  createdByName?: string | null;
  employeeCode?: string | null;
  statusType: string;
  fromStatus?: number | null;
  toStatus?: number | null;
  remark?: string | null;
  createdAt?: string | null;
}

export interface NewInvoicePayload {
  secondary_customer_id: number;
  invoice_number: string;
  invoice_date: string;
  amount: number;
  points: number;
}

export interface NewInvoiceFilter {
  retailer_search?: string;
  invoice_number?: string;
  approval_status?: number | null;
  from_date?: string;
  to_date?: string;
  search?: string;
}

export interface NewInvoiceSummary {
  totalInvoices: number;
  totalRetailers: number;
  approvedSs: number;
  approvedSales: number;
  approvedHo: number;
  pending: number;
  rejected: number;
  totalPoints: number;
  totalAmount: number;
}

export interface RetailerOption {
  id: number;
  ownerName: string;
  shopName: string;
  mobileNumber: string;
  cityName?: string | null;
}

export interface NewInvoiceListResult {
  invoices: NewInvoiceItem[];
  summary: NewInvoiceSummary;
}

type ApiResponse = Record<string, unknown>;

@Injectable({ providedIn: 'root' })
export class NewInvoiceService {
  private readonly baseUrl = '/api/new-invoices';

  constructor(private http: HttpClient, private authService: AuthService) {}

  list(filter: NewInvoiceFilter): Observable<NewInvoiceListResult> {
    return this.http.get<ApiResponse>(this.baseUrl, {
      headers: this.authHeaders(),
      params: this.filterParams(filter)
    }).pipe(
      map(response => {
        const data = this.asRecord(this.pickFirstValue(response, ['new_invoices', 'data.new_invoices', 'data']) ?? response);
        return {
          invoices: this.pickArray(data, ['invoices', 'new_invoices', 'data']).map(row => this.normalizeInvoice(row)),
          summary: this.normalizeSummary(data['summary'])
        };
      }),
      catchError(error => this.handleError(error))
    );
  }

  retailers(search = ''): Observable<RetailerOption[]> {
    const params = search ? new HttpParams().set('search', search) : new HttpParams();
    return this.http.get<ApiResponse>(`${this.baseUrl}/retailers`, { headers: this.authHeaders(), params }).pipe(
      map(response => this.pickArray(response, ['retailers', 'data.retailers', 'data']).map(row => this.normalizeRetailer(row))),
      catchError(error => this.handleError(error))
    );
  }

  get(id: number): Observable<NewInvoiceItem> {
    return this.http.get<ApiResponse>(`${this.baseUrl}/${id}`, { headers: this.authHeaders() }).pipe(
      map(response => this.normalizeInvoice(this.pickFirstValue(response, ['new_invoice', 'data.new_invoice', 'data']) ?? response)),
      catchError(error => this.handleError(error))
    );
  }

  create(payload: NewInvoicePayload): Observable<string> {
    return this.http.post<ApiResponse>(this.baseUrl, payload, { headers: this.authHeaders() }).pipe(
      map(response => this.responseMessage(response) || 'Invoice created successfully'),
      catchError(error => this.handleError(error))
    );
  }

  update(id: number, payload: NewInvoicePayload): Observable<string> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/${id}`, payload, { headers: this.authHeaders() }).pipe(
      map(response => this.responseMessage(response) || 'Invoice updated successfully'),
      catchError(error => this.handleError(error))
    );
  }

  delete(id: number): Observable<string> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/${id}`, { headers: this.authHeaders() }).pipe(
      map(response => this.responseMessage(response) || 'Invoice deleted successfully'),
      catchError(error => this.handleError(error))
    );
  }

  approve(id: number, level: 'ss' | 'sales' | 'ho', remark = ''): Observable<string> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/${id}/approve/${level}`, { remark }, { headers: this.authHeaders() }).pipe(
      map(response => this.responseMessage(response) || 'Invoice approved successfully'),
      catchError(error => this.handleError(error))
    );
  }

  reject(id: number, remark: string): Observable<string> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/${id}/reject`, { remark }, { headers: this.authHeaders() }).pipe(
      map(response => this.responseMessage(response) || 'Invoice rejected successfully'),
      catchError(error => this.handleError(error))
    );
  }

  private filterParams(filter: NewInvoiceFilter): HttpParams {
    let params = new HttpParams();
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') params = params.set(key, String(value));
    });
    return params;
  }

  private authHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  private normalizeInvoice(value: unknown): NewInvoiceItem {
    const row = this.asRecord(value);
    return {
      id: this.readNumber(row['id']),
      secondaryCustomerId: this.readNumber(row['secondary_customer_id'] ?? row['secondaryCustomerId']),
      retailerCode: this.readString(row['retailer_code'] ?? row['retailerCode']),
      customerName: this.readString(row['customer_name'] ?? row['customerName']),
      shopName: this.readString(row['shop_name'] ?? row['shopName']),
      mobileNumber: this.readString(row['mobile_number'] ?? row['mobileNumber']),
      cityName: this.readNullableString(row['city_name'] ?? row['cityName']),
      zoneName: this.readNullableString(row['zone_name'] ?? row['zoneName']),
      invoiceNumber: this.readString(row['invoice_number'] ?? row['invoiceNumber']),
      invoiceDate: this.readString(row['invoice_date'] ?? row['invoiceDate']),
      amount: this.readNumber(row['amount']),
      points: this.readNumber(row['points']),
      approvalStatus: this.readNumber(row['approval_status'] ?? row['approvalStatus']),
      approvalStatusLabel: this.readString(row['approval_status_label'] ?? row['approvalStatusLabel']) || 'Pending',
      approvalRemark: this.readNullableString(row['approval_remark'] ?? row['approvalRemark']),
      createdBy: this.readNumber(row['created_by'] ?? row['createdBy']),
      createdByName: this.readNullableString(row['created_by_name'] ?? row['createdByName']),
      createdAt: this.readNullableString(row['created_at'] ?? row['createdAt']),
      approvalLogs: this.pickArray(row, ['approval_logs', 'approvalLogs']).map(log => this.normalizeApprovalLog(log))
    };
  }

  private normalizeApprovalLog(value: unknown): NewInvoiceApprovalLog {
    const row = this.asRecord(value);
    return {
      id: this.readNumber(row['id']),
      logDate: this.readNullableString(row['log_date'] ?? row['logDate']),
      createdBy: this.readNumber(row['created_by'] ?? row['createdBy']) || null,
      createdByName: this.readNullableString(row['created_by_name'] ?? row['createdByName']),
      employeeCode: this.readNullableString(row['employee_code'] ?? row['employeeCode']),
      statusType: this.readString(row['status_type'] ?? row['statusType']),
      fromStatus: this.readNumber(row['from_status'] ?? row['fromStatus']) || null,
      toStatus: this.readNumber(row['to_status'] ?? row['toStatus']) || null,
      remark: this.readNullableString(row['remark']),
      createdAt: this.readNullableString(row['created_at'] ?? row['createdAt'])
    };
  }

  private normalizeRetailer(value: unknown): RetailerOption {
    const row = this.asRecord(value);
    return {
      id: this.readNumber(row['id']),
      ownerName: this.readString(row['owner_name'] ?? row['ownerName']),
      shopName: this.readString(row['shop_name'] ?? row['shopName']),
      mobileNumber: this.readString(row['mobile_number'] ?? row['mobileNumber']),
      cityName: this.readNullableString(row['city_name'] ?? row['cityName'])
    };
  }

  private normalizeSummary(value: unknown): NewInvoiceSummary {
    const row = this.asRecord(value);
    return {
      totalInvoices: this.readNumber(row['total_invoices'] ?? row['totalInvoices']),
      totalRetailers: this.readNumber(row['total_retailers'] ?? row['totalRetailers']),
      approvedSs: this.readNumber(row['approved_ss'] ?? row['approvedSs']),
      approvedSales: this.readNumber(row['approved_sales'] ?? row['approvedSales']),
      approvedHo: this.readNumber(row['approved_ho'] ?? row['approvedHo']),
      pending: this.readNumber(row['pending']),
      rejected: this.readNumber(row['rejected']),
      totalPoints: this.readNumber(row['total_points'] ?? row['totalPoints']),
      totalAmount: this.readNumber(row['total_amount'] ?? row['totalAmount'])
    };
  }

  private responseMessage(response: ApiResponse): string {
    return this.readMessage(response['message']);
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? value as Record<string, unknown> : {};
  }

  private asArray(value: unknown): unknown[] {
    if (Array.isArray(value)) return value;
    const row = this.asRecord(value);
    const values = row['$values'] ?? row['values'] ?? row['items'] ?? row['data'];
    return Array.isArray(values) ? values : [];
  }

  private pickArray(source: unknown, paths: string[]): unknown[] {
    for (const path of paths) {
      const rows = this.asArray(this.pickValue(source, path.split('.')));
      if (rows.length > 0) return rows;
    }
    return Array.isArray(source) ? source : [];
  }

  private pickFirstValue(source: unknown, paths: string[]): unknown {
    for (const path of paths) {
      const value = this.pickValue(source, path.split('.'));
      if (value !== undefined && value !== null) return value;
    }
    return undefined;
  }

  private pickValue(source: unknown, path: string[]): unknown {
    let current: unknown = source;
    for (const part of path) {
      const row = this.asRecord(current);
      current = row[part];
      if (current === undefined || current === null) return undefined;
    }
    return current;
  }

  private readNumber(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }

  private readString(value: unknown): string {
    return typeof value === 'string' ? value : value === null || value === undefined ? '' : String(value);
  }

  private readNullableString(value: unknown): string | null {
    const text = this.readString(value);
    return text || null;
  }

  private handleError(error: unknown): Observable<never> {
    if (error instanceof HttpErrorResponse) {
      return throwError(() => new Error(this.readMessage(error.error?.message) || error.message || 'New invoice API request failed.'));
    }
    if (error instanceof Error) return throwError(() => error);
    return throwError(() => new Error('New invoice API request failed.'));
  }

  private readMessage(message: unknown): string {
    if (typeof message === 'string') return message;
    if (message && typeof message === 'object') {
      return Object.values(message).flatMap(value => Array.isArray(value) ? value : [value]).filter((value): value is string => typeof value === 'string').join(' ');
    }
    return '';
  }
}
