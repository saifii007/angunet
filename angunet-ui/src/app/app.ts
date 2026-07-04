import { Component } from '@angular/core';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly environmentName = environment.name;
  protected readonly apiBaseUrl = environment.apiBaseUrl;
  protected readonly uiUrl = environment.uiUrl;
  protected readonly dockerApiUrl = environment.dockerApiUrl;
  protected readonly dockerUiUrl = environment.dockerUiUrl;
  protected readonly apiProxyPath = environment.apiProxyPath;
}
