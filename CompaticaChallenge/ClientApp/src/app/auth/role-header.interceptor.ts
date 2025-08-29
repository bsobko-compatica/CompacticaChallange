import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler } from '@angular/common/http';
import { AuthService } from './auth.service';

@Injectable()
export class RoleHeaderInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService) { }
  intercept(req: HttpRequest<any>, next: HttpHandler) {
    const setHeaders: Record<string, string> = {};
    if (this.auth.role) setHeaders['X-Demo-Role'] = this.auth.role;
    const cloned = Object.keys(setHeaders).length ? req.clone({ setHeaders }) : req;
    return next.handle(cloned);
  }
}
