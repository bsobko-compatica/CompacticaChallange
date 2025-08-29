import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { RouterModule } from '@angular/router';

import { AppComponent } from './app.component';
import { LoginComponent } from './auth/login.component';
import { TenantsComponent } from './tenants/tenants.component';
import { HeatmapComponent } from './heatmap/heatmap.component';
import { ParcelTableComponent } from './parcel-table/parcel-table.component';

import { AuthGuard } from './auth/auth.guard';
import { RoleHeaderInterceptor } from './auth/role-header.interceptor';

@NgModule({
  declarations: [
    AppComponent, LoginComponent, TenantsComponent, HeatmapComponent, ParcelTableComponent
  ],
  imports: [
    BrowserModule, FormsModule, HttpClientModule,
    RouterModule.forRoot([
      { path: 'login', component: LoginComponent },
      { path: '', pathMatch: 'full', redirectTo: 'tenants' },
      { path: 'tenants', component: TenantsComponent, canActivate: [AuthGuard] },
      { path: 'heatmap/:tenant', component: HeatmapComponent, canActivate: [AuthGuard] },
      { path: '**', redirectTo: 'tenants' }
    ])
  ],
  providers: [
    AuthGuard,
    { provide: HTTP_INTERCEPTORS, useClass: RoleHeaderInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
