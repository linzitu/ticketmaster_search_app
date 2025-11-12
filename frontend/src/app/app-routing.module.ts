import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SearchPageComponent } from './pages/search-page.component';

export const routes: Routes = [ // 添加 export 关键字
  { path: '', component: SearchPageComponent }, // 默认路径加载 SearchPageComponent
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
