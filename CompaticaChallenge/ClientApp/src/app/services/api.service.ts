import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TenantInfo { key: string; projectId?: number; projectName?: string; fileSizeBytes?: number; }
export interface HeatPoint { latitude?: number; longitude?: number; cmv?: number; evib?: number; compactionIndex?: number; startTime?: string; }
export interface ParcelSummary { parcelId: number; passCount: number; avgCmv?: number; avgEvib?: number; avgCompactionIndex?: number; firstPass?: string; lastPass?: string; }

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = '/api/v1';
  constructor(private http: HttpClient) { }

  tenants(): Observable<TenantInfo[]> {
    return this.http.get<TenantInfo[]>(`${this.base}/tenants`);
  }

  heatmap(tenant: string, q?: { from?: string; to?: string; projectId?: number; }) {
    let params = new HttpParams();
    if (q?.from) params = params.set('from', q.from);
    if (q?.to) params = params.set('to', q.to);
    if (q?.projectId != null) params = params.set('projectId', q.projectId);
    return this.http.get<HeatPoint[]>(`${this.base}/${tenant}/roller-passes/heatmap`, { params });
  }

  parcels(tenant: string, q?: { from?: string; to?: string; projectId?: number; limit?: number; }) {
    let params = new HttpParams().set('limit', '500');
    if (q?.from) params = params.set('from', q.from);
    if (q?.to) params = params.set('to', q.to);
    if (q?.projectId != null) params = params.set('projectId', q.projectId);
    if (q?.limit != null) params = params.set('limit', q.limit);
    return this.http.get<ParcelSummary[]>(`${this.base}/${tenant}/parcels/summary`, { params });
  }
}
