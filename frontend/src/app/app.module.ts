import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';

import { AppComponent } from './app.component';
import { PagesModule } from './pages/pages.module';   // ✅ 你刚加的模块
import { appRoutes } from './app.routes';             // ✅ 改成正确的变量名

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    RouterModule.forRoot(appRoutes),  // ✅ 用正确名字
    PagesModule,                      // ✅ 确保加上这个
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
