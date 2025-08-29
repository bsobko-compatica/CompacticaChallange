import { Component, Input, ViewEncapsulation, OnChanges } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ParcelSummary } from '../services/api.service';

type Status = 'OK' | 'Watch' | 'Action';

@Component({
  selector: 'app-parcel-table',
  encapsulation: ViewEncapsulation.None,
  providers: [DatePipe],
  templateUrl: './parcel-table.component.html',
  styles: [`
    .card{background:#fff;border:1px solid #e5e7eb;border-radius:12px}
    .card-head{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid #eef0f2;gap:12px}
    .title{font-weight:700}
    .controls{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
    .seg{display:flex;gap:6px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:6px}
    .seg label{display:flex;gap:6px;align-items:center;padding:6px 10px;border-radius:8px;cursor:pointer;font-weight:600}
    .seg input{accent-color:#111}
    .search{min-width:200px;padding:7px 10px;border:1px solid #e5e7eb;border-radius:8px}
    .btn{border-radius:8px;padding:8px 12px;border:1px solid #e5e7eb;background:#f9fafb;cursor:pointer;white-space:nowrap}
    .table-wrap{overflow:auto}
    table{width:100%;border-collapse:separate;border-spacing:0}
    thead th{padding:12px 14px;text-align:left;border-bottom:1px solid #e5e7eb;white-space:nowrap;font-weight:700}
    tbody td{padding:12px 14px;border-bottom:1px solid #f1f3f5;vertical-align:middle}
    tbody tr:last-child td{border-bottom:none}
    .mono{font-variant-numeric:tabular-nums}
    .badge{display:inline-block;padding:4px 10px;border-radius:999px;font-weight:700;font-size:12px}
    .badge.ok{background:#e8f7ef;color:#176b3a}
    .badge.watch{background:#fdecc8;color:#8a5a00}
    .badge.action{background:#fde2e2;color:#8a1f1f}
    .nowrap{white-space:nowrap}
    .legend{padding:10px 14px;color:#6b7280;font-size:12px;display:flex;gap:16px;border-top:1px solid #eef0f2}
    .legend-item{display:inline-flex;align-items:center;gap:6px}
    .dot{width:10px;height:10px;border-radius:999px;display:inline-block}
    .dot.ok{background:#2ecc71}.dot.watch{background:#f1c40f}.dot.action{background:#e74c3c}
    .summary{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    .pill{display:inline-flex;gap:6px;align-items:center;padding:6px 10px;border:1px solid #e5e7eb;border-radius:999px;background:#f9fafb;font-weight:600}
  `]
})
export class ParcelTableComponent implements OnChanges {
  @Input() rows: ParcelSummary[] = [];

  // фільтри
  showOK = true;
  showWatch = true;
  showAction = true;
  q = '';

  // кешовані відфільтровані
  filtered: ParcelSummary[] = [];

  constructor(private datePipe: DatePipe) { }

  ngOnChanges(): void {
    this.applyFilters();
  }

  fmtDate(v?: string): string {
    return v ? (this.datePipe.transform(v, 'yyyy-MM-dd HH:mm') ?? '–') : '–';
  }

  status(r: ParcelSummary): Status {
    const ci = Number(r.avgCompactionIndex ?? 0);
    if (!Number.isFinite(ci)) return 'Watch';
    if (ci < 75) return 'Action';
    if (ci < 85) return 'Watch';
    return 'OK';
  }

  badgeClass(s: Status): string {
    return s === 'OK' ? 'ok' : s === 'Watch' ? 'watch' : 'action';
  }

  actionText(s: Status): string {
    if (s === 'OK') return 'No action';
    if (s === 'Watch') return 'Spot-check low CI areas';
    return 'Re-compact and re-measure';
  }

  // нова “людська” метрика — тривалість від першого до останнього проходу
  duration(r: ParcelSummary): string {
    const a = r.firstPass ? new Date(r.firstPass).getTime() : NaN;
    const b = r.lastPass ? new Date(r.lastPass).getTime() : NaN;
    if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return '–';
    const ms = b - a;
    const days = Math.floor(ms / 86400000);
    const hrs = Math.round((ms % 86400000) / 3600000);
    return days ? `${days}d ${hrs}h` : `${hrs}h`;
  }

  exportPdf(): void {
    const cols = ['ParcelId', 'Passes', 'Avg CMV', 'Avg Evib', 'Avg CI', 'First pass', 'Last pass'];
    const rowsHtml = (this.filtered || []).map(r => `
      <tr>
        <td>${esc(r.parcelId)}</td>
        <td class="mono">${esc(r.passCount)}</td>
        <td class="mono">${fmt(r.avgCmv)}</td>
        <td class="mono">${fmt(r.avgEvib)}</td>
        <td class="mono">${fmt(r.avgCompactionIndex)}</td>
        <td class="mono">${esc(r.firstPass)}</td>
        <td class="mono">${esc(r.lastPass)}</td>
      </tr>`).join('');

    const html = `<!doctype html><html><head><meta charset="utf-8">
<title>Compaction report</title>
<style>
body{font:12px/1.4 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111;margin:24px}
h1{font-size:18px;margin:0 0 8px}
.meta{color:#555;margin-bottom:12px}
table{width:100%;border-collapse:collapse}
th,td{padding:8px 10px;border:1px solid #ddd;text-align:left}
th{background:#f7f7f7}.mono{font-variant-numeric:tabular-nums}
@media print{@page{size:A4 landscape;margin:12mm}}
</style></head>
<body>
<h1>Compaction report</h1>
<div class="meta">Generated: ${new Date().toISOString().replace('T', ' ').slice(0, 16)}</div>
<table><thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
<tbody>${rowsHtml}</tbody></table>
<script>window.print()</script></body></html>`;

    const w = window.open('', '_blank'); if (!w) return;
    w.document.open(); w.document.write(html); w.document.close();

    function fmt(v: any) { const n = Number(v); return Number.isFinite(n) ? n.toFixed(2) : ''; }
    function esc(v: any) { return (v ?? '') as any; }
  }

  applyFilters(): void {
    const q = (this.q || '').trim().toLowerCase();
    this.filtered = (this.rows || []).filter(r => {
      const s = this.status(r);
      if ((s === 'OK' && !this.showOK) || (s === 'Watch' && !this.showWatch) || (s === 'Action' && !this.showAction)) {
        return false;
      }
      if (!q) return true;
      return String(r.parcelId).includes(q);
    });
  }

  // для підсумків
  countBy(status: Status): number {
    return (this.filtered || []).reduce((n, r) => n + (this.status(r) === status ? 1 : 0), 0);
  }
}
