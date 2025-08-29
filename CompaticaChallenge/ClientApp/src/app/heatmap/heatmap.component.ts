import { AfterViewInit, Component, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import * as L from 'leaflet';
import 'leaflet.heat';
import { ApiService, HeatPoint, ParcelSummary } from '../services/api.service';

@Component({
  selector: 'app-heatmap',
  encapsulation: ViewEncapsulation.None,  // ⬅ стилі стають глобальними, легенда стилізується
  template: `
  <div class="page">
    <header class="topbar">
      <div class="left">
        <button class="btn btn-light" (click)="goBack()" aria-label="Go back">← Back</button>
        <div class="meta">
          <div class="title">Compaction heatmap</div>
          <div class="crumbs" *ngIf="tenant || projectId">
            <span *ngIf="tenant">{{tenant}}</span>
            <span *ngIf="tenant && projectId" class="sep">/</span>
            <span *ngIf="projectId">project {{projectId}}</span>
          </div>
        </div>
      </div>
      <div class="right">
        <span class="badge">Role: {{role}}</span>
      </div>
    </header>

    <div class="container">
      <div *ngIf="error" class="text-danger my-2">{{error}}</div>
      <div id="map" class="map"></div>
      <app-parcel-table class="d-block mt-3" [rows]="parcels"></app-parcel-table>
    </div>
  </div>
  `,
  styles: [`
    .page { padding: 12px; }
    .container { padding: 0 8px; }

    .topbar {
      display:flex; align-items:center; justify-content:space-between;
      gap:12px; padding:12px 16px; margin-bottom:8px;
      border:1px solid #e5e7eb; border-radius:10px; background:#fff;
      box-shadow:0 1px 4px rgba(0,0,0,.06);
    }
    .left { display:flex; align-items:center; gap:12px; min-width:0; }
    .meta { display:grid; line-height:1.15; }
    .title { font-weight:600; }
    .crumbs { color:#6b7280; font-size:12px; }
    .sep { padding:0 6px; color:#9ca3af; }

    .right { display:flex; align-items:center; gap:10px; }
    .badge {
      font-size:12px; color:#111827; background:#f3f4f6; border:1px solid #e5e7eb;
      padding:4px 8px; border-radius:999px;
    }

    .btn { border-radius:8px; padding:6px 10px; cursor:pointer;
      border:1px solid #e5e7eb; background:#f3f4f6; color:#111827; }
    .btn.btn-light { background:#f3f4f6; }

    .map { height:420px; border-radius:8px; border:1px solid #ddd; }

    /* Legend (глобальні стилі завдяки ViewEncapsulation.None) */
    .heat-legend {
      background:#fff; padding:8px 10px; border:1px solid #ddd; border-radius:8px;
      box-shadow:0 1px 4px rgba(0,0,0,.12);
      font:12px/1.2 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;
    }
    .leaflet-bottom.leaflet-left .heat-legend { margin: 0 0 10px 10px; }
    .heat-legend .legend-title { font-weight:600; margin-bottom:6px; }
    .heat-legend .legend-gradient {
      width:180px; height:10px; border-radius:6px; border:1px solid #ccc;
      /* градієнт, узгоджений з leaflet.heat: синій → бірюза → лайм → жовтий → червоний */
      background: linear-gradient(to right, #0011ff, #00b3ff, #00ff66, #ffff00, #ff3300);
    }
    .heat-legend .legend-labels {
      display:flex; justify-content:space-between; margin-top:4px; color:#555;
    }
  `]
})
export class HeatmapComponent implements AfterViewInit {
  tenant = '';
  projectId?: number;
  role = (localStorage.getItem('role') || 'Admin');
  error?: string;
  parcels: ParcelSummary[] = [];

  private map?: L.Map;
  private heat?: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private api: ApiService
  ) { }

  ngAfterViewInit(): void {
    this.tenant = this.route.snapshot.paramMap.get('tenant') || '';
    const p = this.route.snapshot.queryParamMap.get('projectId');
    this.projectId = p ? +p : undefined;

    this.map = L.map('map', { center: [47.56, -52.71], zoom: 12 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' })
      .addTo(this.map);

    this.addLegend();
    this.load();
  }

  goBack(): void {
    if (window.history.length > 1) this.location.back();
    else this.router.navigate(['/']);
  }

  private load(): void {
    this.api.heatmap(this.tenant, { projectId: this.projectId }).subscribe({
      next: pts => this.renderHeat(pts),
      error: _ => this.error = 'Failed to load heatmap'
    });

    this.api.parcels(this.tenant, { projectId: this.projectId, limit: 200 }).subscribe({
      next: rows => this.parcels = rows
    });
  }

  private renderHeat(points: HeatPoint[]): void {
    if (!this.map) return;

    const data = (points || [])
      .filter(p => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
      .map(p => {
        const v = p.cmv ?? p.evib ?? p.compactionIndex ?? 0;
        const intensity = Math.max(0.05, Math.min(1, Number(v) / 100));
        return [Number(p.latitude), Number(p.longitude), intensity] as [number, number, number];
      });

    if (this.heat) this.map!.removeLayer(this.heat);
    // @ts-ignore
    this.heat = L.heatLayer(data, { radius: 18, blur: 12 }).addTo(this.map!);

    if (data.length) {
      const bounds = L.latLngBounds(data.map(d => L.latLng(d[0], d[1]))).pad(0.15);
      this.map!.fitBounds(bounds);
    } else {
      this.error = 'No geospatial points after normalization (demo shows empty map).';
      this.map!.setView([47.56, -52.71], 6);
    }
  }

  private addLegend(): void {
    const legend = (L.control as any)({ position: 'bottomleft' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'heat-legend');
      div.innerHTML = `
        <div class="legend-title">Issue intensity</div>
        <div class="legend-gradient"></div>
        <div class="legend-labels"><span>Good</span><span>Bad</span></div>
      `;
      L.DomEvent.disableClickPropagation(div);
      return div;
    };
    legend.addTo(this.map);
  }
}
