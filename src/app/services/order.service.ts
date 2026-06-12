import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { API_BASE_URL } from '../config/api.config';
import { AuthService } from './auth.service';
import { UserOption } from './user.service';

export interface Order {
  id: number;
  active: string;
  orderDate?: string | null;
  completedDate?: string | null;
  orderNo: string;
  buyerId?: number | null;
  buyerName?: string | null;
  sellerId?: number | null;
  sellerName?: string | null;
  executiveId?: number | null;
  executiveName?: string | null;
  branchName?: string | null;
  totalQty: number;
  subTotal: number;
  grandTotal: number;
  statusId?: number | null;
  statusName: string;
  createdByName?: string | null;
  createdAt?: string | null;
  orderType?: string | null;
}

export interface OrderFilters {
  retailersId?: number | null;
  distributorId?: number | null;
  userId?: number | null;
  divisionId?: number | null;
  designationIds?: number[];
  pendingStatus?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  search?: string | null;
}

export interface OrderProductOption extends UserOption {
  productCode?: string | null;
  hsnSac: number;
  price?: number | null;
}

export interface OrderOptions {
  users: UserOption[];
  divisions: UserOption[];
  designations: UserOption[];
  retailers: UserOption[];
  distributors: UserOption[];
  families: UserOption[];
}

export interface OrderDetailPayload {
  subcategoryId: number | null;
  productId: number | null;
  quantity: number | null;
  mrp: number | null;
  gst: number | null;
  taxAmount: number | null;
  lineTotal: number | null;
}

export interface OrderPayload {
  orderDate: string;
  executiveId: number | null;
  type: string;
  buyerId: number | null;
  sellerId: number | null;
  grandTotal: number;
  subTotal: number;
  totalQty: number;
  totalGst: number;
  orderRemark?: string | null;
  orderDetail: OrderDetailPayload[];
}

type ApiResponse = Record<string, unknown>;

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly baseUrl = API_BASE_URL;

  constructor(private http: HttpClient, private authService: AuthService) {}

  getOrders(filters: OrderFilters = {}): Observable<Order[]> {
    return this.http.get<ApiResponse>(`${this.baseUrl}/orders`, {
      headers: this.authHeaders(),
      params: this.filterParams(filters)
    }).pipe(
      map(response => this.pickArray(response, ['orders', 'data.orders', 'data']).map(row => this.normalizeOrder(row)).filter(row => row.id > 0)),
      catchError(error => this.handleError(error))
    );
  }

  getOptions(): Observable<OrderOptions> {
    return this.http.get<ApiResponse>(`${this.baseUrl}/orders/options`, {
      headers: this.authHeaders()
    }).pipe(
      map(response => {
        const source = this.asRecord(this.pickFirstValue(response, ['options', 'data.options']) ?? response);
        return {
          users: this.optionArray(source, 'users'),
          divisions: this.optionArray(source, 'divisions'),
          designations: this.optionArray(source, 'designations'),
          retailers: this.optionArray(source, 'retailers'),
          distributors: this.optionArray(source, 'distributors'),
          families: this.optionArray(source, 'families')
        };
      }),
      catchError(error => this.handleError(error))
    );
  }

  getProductsByFamily(familyId: number): Observable<OrderProductOption[]> {
    return this.http.get<ApiResponse>(`${this.baseUrl}/orders/products`, {
      headers: this.authHeaders(),
      params: new HttpParams().set('subcategory_id', String(familyId))
    }).pipe(
      map(response => this.pickArray(response, ['products', 'data.products', 'data']).map(row => this.normalizeProduct(row)).filter(row => row.id > 0)),
      catchError(error => this.handleError(error))
    );
  }

  createOrder(payload: OrderPayload): Observable<{ order?: Order; message: string }> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/orders`, this.toApiPayload(payload), {
      headers: this.authHeaders()
    }).pipe(
      map(response => {
        const order = this.pickFirstValue(response, ['order', 'data.order']);
        return { order: order ? this.normalizeOrder(order) : undefined, message: this.responseMessage(response) || 'Order Created Successfully' };
      }),
      catchError(error => this.handleError(error))
    );
  }

  exportOrders(filters: OrderFilters = {}): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/orders/export`, {
      headers: this.authHeaders(),
      params: this.filterParams(filters),
      responseType: 'blob'
    }).pipe(catchError(error => this.handleError(error)));
  }

  private filterParams(filters: OrderFilters): HttpParams {
    let params = new HttpParams();
    if (filters.retailersId) params = params.set('retailers_id', String(filters.retailersId));
    if (filters.distributorId) params = params.set('distributor_id', String(filters.distributorId));
    if (filters.userId) params = params.set('user_id', String(filters.userId));
    if (filters.divisionId) params = params.set('division_id', String(filters.divisionId));
    if (filters.pendingStatus !== null && filters.pendingStatus !== undefined) params = params.set('pending_status', String(filters.pendingStatus));
    if (filters.startDate) params = params.set('startdate', filters.startDate);
    if (filters.endDate) params = params.set('enddate', filters.endDate);
    if (filters.search?.trim()) params = params.set('search', filters.search.trim());
    for (const id of filters.designationIds ?? []) params = params.append('designation_id', String(id));
    return params;
  }

  private toApiPayload(payload: OrderPayload): Record<string, unknown> {
    return {
      order_date: payload.orderDate,
      executive_id: payload.executiveId,
      type: payload.type,
      buyer_id: payload.buyerId,
      seller_id: payload.sellerId,
      grand_total: payload.grandTotal,
      sub_total: payload.subTotal,
      total_qty: payload.totalQty,
      total_gst: payload.totalGst,
      order_remark: payload.orderRemark,
      order_detail: payload.orderDetail.map(row => ({
        subcategory_id: row.subcategoryId,
        product_id: row.productId,
        quantity: row.quantity,
        mrp: row.mrp,
        gst: row.gst,
        tax_amount: row.taxAmount,
        line_total: row.lineTotal
      }))
    };
  }

  private authHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  private normalizeOrder(value: unknown): Order {
    const row = this.asRecord(value);
    return {
      id: this.readNumber(row['id'] ?? row['Id']),
      active: this.readString(row['active'] ?? row['Active']) || 'Y',
      orderDate: this.readNullableString(row['orderDate'] ?? row['order_date'] ?? row['OrderDate']),
      completedDate: this.readNullableString(row['completedDate'] ?? row['completed_date'] ?? row['CompletedDate']),
      orderNo: this.readString(row['orderNo'] ?? row['order_no'] ?? row['OrderNo']),
      buyerId: this.readNullableNumber(row['buyerId'] ?? row['buyer_id'] ?? row['BuyerId']),
      buyerName: this.readNullableString(row['buyerName'] ?? row['buyer_name'] ?? row['BuyerName']),
      sellerId: this.readNullableNumber(row['sellerId'] ?? row['seller_id'] ?? row['SellerId']),
      sellerName: this.readNullableString(row['sellerName'] ?? row['seller_name'] ?? row['SellerName']),
      executiveId: this.readNullableNumber(row['executiveId'] ?? row['executive_id'] ?? row['ExecutiveId']),
      executiveName: this.readNullableString(row['executiveName'] ?? row['executive_name'] ?? row['ExecutiveName']),
      branchName: this.readNullableString(row['branchName'] ?? row['branch_name'] ?? row['BranchName']),
      totalQty: this.readNumber(row['totalQty'] ?? row['total_qty'] ?? row['TotalQty']),
      subTotal: this.readNumber(row['subTotal'] ?? row['sub_total'] ?? row['SubTotal']),
      grandTotal: this.readNumber(row['grandTotal'] ?? row['grand_total'] ?? row['GrandTotal']),
      statusId: this.readNullableNumber(row['statusId'] ?? row['status_id'] ?? row['StatusId']),
      statusName: this.readString(row['statusName'] ?? row['status_name'] ?? row['StatusName']) || 'Pending',
      createdByName: this.readNullableString(row['createdByName'] ?? row['created_by_name'] ?? row['CreatedByName']),
      createdAt: this.readNullableString(row['createdAt'] ?? row['created_at'] ?? row['CreatedAt']),
      orderType: this.readNullableString(row['orderType'] ?? row['order_type'] ?? row['OrderType'])
    };
  }

  private normalizeProduct(value: unknown): OrderProductOption {
    const row = this.asRecord(value);
    return {
      id: this.readNumber(row['id'] ?? row['Id']),
      name: this.readString(row['name'] ?? row['Name']),
      productCode: this.readNullableString(row['productCode'] ?? row['product_code'] ?? row['ProductCode']),
      hsnSac: this.readNumber(row['hsnSac'] ?? row['hsn_sac'] ?? row['HsnSac']),
      price: this.readNullableNumber(row['price'] ?? row['Price'])
    };
  }

  private optionArray(source: Record<string, unknown>, key: string): UserOption[] {
    return this.asArray(source[key]).map(value => {
      const row = this.asRecord(value);
      return { id: this.readNumber(row['id'] ?? row['Id']), name: this.readString(row['name'] ?? row['Name']) };
    }).filter(option => option.id > 0);
  }

  private pickArray(source: unknown, paths: string[]): unknown[] {
    for (const path of paths) {
      const value = this.pickValue(source, path.split('.'));
      const rows = this.asArray(value);
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
      current = this.asRecord(current)[part];
      if (current === undefined || current === null) return undefined;
    }
    return current;
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

  private readNumber(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }

  private readNullableNumber(value: unknown): number | null {
    const number = this.readNumber(value);
    return number > 0 ? number : null;
  }

  private readString(value: unknown): string {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    return '';
  }

  private readNullableString(value: unknown): string | null {
    const text = this.readString(value);
    return text || null;
  }

  private responseMessage(response: ApiResponse): string {
    return this.readMessage(response['message'] ?? response['Message']);
  }

  private handleError(error: unknown): Observable<never> {
    if (error instanceof HttpErrorResponse) {
      return throwError(() => new Error(this.readMessage(error.error?.message) || error.message || 'Order API request failed.'));
    }
    return throwError(() => error instanceof Error ? error : new Error('Order API request failed.'));
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
