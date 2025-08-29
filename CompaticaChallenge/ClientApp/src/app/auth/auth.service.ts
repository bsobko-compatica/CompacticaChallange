import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

export type Role = 'Viewer' | 'Admin';

@Injectable({ providedIn: 'root' })
export class AuthService {
  role: Role | null = null;

  constructor(private router: Router) { }

  load() {
    const r = localStorage.getItem('role') as Role | null;
    if (r) this.role = r;
  }

  setRole(r: Role) {
    this.role = r;
    localStorage.setItem('role', r);
  }

  logout() {
    localStorage.removeItem('role');
    this.role = null;
    this.router.navigateByUrl('/login');
  }

  isAdmin() { return this.role === 'Admin'; }
  isAuthed() { return this.role !== null; }
}
