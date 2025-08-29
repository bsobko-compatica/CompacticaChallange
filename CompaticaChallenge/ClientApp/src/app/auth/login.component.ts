import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, Role } from './auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html'
})
export class LoginComponent {
  role: Role = 'Viewer'; 

  constructor(private auth: AuthService, private router: Router) {
    this.role = auth.role ?? 'Viewer'; 
  }

  submit() {
    this.auth.setRole(this.role);
    this.router.navigateByUrl('/tenants');
  }
}
