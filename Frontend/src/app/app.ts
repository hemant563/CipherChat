import { Component, signal } from '@angular/core';
import { AppLayout } from './layout/app-layout/app-layout';
import { ToastComponent } from './components/toast/toast.component';

@Component({
  selector: 'app-root',
  imports: [AppLayout, ToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('CipherChat');
}
