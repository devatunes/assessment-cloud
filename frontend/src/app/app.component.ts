import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="app-header">
      <hgroup>
        <h1>Assessment Cloud</h1>
        <p>Plataforma de evaluaciones técnicas</p>
      </hgroup>
      <nav class="app-nav">
        <a routerLink="/questions" routerLinkActive="contrast">Preguntas</a>
        <a routerLink="/assessments" routerLinkActive="contrast">Assessments</a>
      </nav>
    </header>
    <main>
      <router-outlet />
    </main>
  `,
})
export class AppComponent {}
