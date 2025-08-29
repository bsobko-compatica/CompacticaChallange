import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: 'tenants', pathMatch: 'full' },
  {
    path: 'tenants',
    loadChildren: () =>
      import('./tenants/tenants.module').then(m => m.TenantsModule)
  },
  { path: '**', redirectTo: 'tenants' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
