import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService, TenantInfo } from '../services/api.service';
import { AuthService } from '../auth/auth.service';

type TenantVm = { id: string; name?: string; size?: number; projectId?: number };

@Component({
  selector: 'app-tenants',
  templateUrl: './tenants.component.html'
})
export class TenantsComponent implements OnInit {
  tenants: TenantVm[] = [];
  loading = true;
  error?: string;

  term = '';
  sort: 'name' | 'size' = 'name';

  constructor(
    private api: ApiService,
    private router: Router,
    public auth: AuthService
  ) { }

  ngOnInit(): void {
    this.fetch();
  }

  private fetch(): void {
    this.loading = true;
    this.api.tenants().subscribe({
      next: (list: TenantInfo[]) => {
        // Діагностика у консоль — видно, що реально приходить
        console.log('tenants/api response', list);

        this.tenants = (list || []).map<TenantVm>(t => ({
          id: t.key,
          name: t.projectName ?? '',
          size: t.fileSizeBytes,
          projectId: t.projectId ?? undefined
        }));

        this.loading = false;

        // Якщо щось відфільтрували випадково — скинемо пошук
        if (this.tenants.length > 0 && this.view.length === 0 && this.term) {
          this.term = '';
        }
      },
      error: err => {
        console.error('tenants/api error', err);
        this.error = 'Failed to load tenants';
        this.loading = false;
      }
    });
  }

  get view(): TenantVm[] {
    const q = this.term.trim().toLowerCase();
    let r = this.tenants;
    if (q) {
      r = r.filter(x =>
        x.id.toLowerCase().includes(q) || (x.name ?? '').toLowerCase().includes(q)
      );
    }
    r = [...r].sort((a, b) => {
      if (this.sort === 'size') return (b.size ?? 0) - (a.size ?? 0);
      return a.id.localeCompare(b.id);
    });
    return r;
  }

  resetFilters(): void {
    this.term = '';
    this.sort = 'name';
  }

  go(id: string): void {
    const t = this.tenants.find(x => x.id === id);
    const qs = new URLSearchParams();
    if (t?.projectId != null) qs.set('projectId', String(t.projectId));
    this.router.navigateByUrl(`/heatmap/${id}?${qs.toString()}`);
  }

  trackById(_: number, t: TenantVm): string {
    return t.id;
  }

  formatSize(bytes?: number): string {
    if (bytes == null) return '';
    const kb = 1_000, mb = 1_000_000, gb = 1_000_000_000;
    if (bytes >= gb) return (bytes / gb).toFixed(2) + ' GB';
    if (bytes >= mb) return (bytes / mb).toFixed(1) + ' MB';
    if (bytes >= kb) return Math.round(bytes / kb) + ' KB';
    return bytes + ' B';
  }
}
