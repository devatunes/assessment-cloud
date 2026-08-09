import { Injectable, signal } from '@angular/core';

export interface TourStep {
  title: string;
  body: string;
}

const ORG_TOUR_KEY = 'assessment_cloud_org_tour_seen';
const CANDIDATE_TOUR_KEY = 'assessment_cloud_candidate_tour_seen';

const ORG_STEPS: TourStep[] = [
  {
    title: '¡Bienvenido a Assessment Cloud!',
    body: 'Acá puedes construir tu biblioteca de preguntas técnicas, organizadas por categoría y dificultad.',
  },
  {
    title: 'Bancos de preguntas',
    body: 'Agrupa preguntas reutilizables — tuyas o públicas de otras organizaciones — para usarlas rápido al crear un assessment.',
  },
  {
    title: 'Assessments',
    body: 'Crea evaluaciones, márcalas como oficiales (con invitación) o simulacro (público), y genera el link para tus candidatos.',
  },
  {
    title: 'Reportes',
    body: 'Mira resultados individuales y agrupados, con gráficas de niveles alcanzados y tasa de acierto por pregunta.',
  },
  {
    title: 'Usuarios',
    body: 'Si eres admin, invita a tu equipo de reclutadores desde la sección "Usuarios".',
  },
];

const CANDIDATE_STEPS: TourStep[] = [
  {
    title: '¡Bienvenido!',
    body: 'Acá puedes practicar simulacros técnicos gratis, creados por distintas organizaciones.',
  },
  {
    title: 'Simulacros',
    body: 'Cada simulacro tiene preguntas de opción múltiple y de código, a veces con tiempo límite.',
  },
  {
    title: 'Tu nivel e insignias',
    body: 'Al terminar verás tu nivel (Junior/Semisenior/Senior) según tu puntaje, y puedes ganar insignias por tus logros.',
  },
  {
    title: 'Tu historial',
    body: 'Revisa tus intentos pasados y tus insignias en cualquier momento desde "Mi historial".',
  },
];

// Tour breve, sin librería externa: un modal con pasos, no un spotlight sobre
// el DOM real. Se muestra una sola vez por navegador (localStorage), separado
// entre staff de organización y candidatos porque son audiencias y flujos
// distintos.
@Injectable({ providedIn: 'root' })
export class OnboardingTourService {
  readonly steps = signal<TourStep[] | null>(null);
  readonly currentIndex = signal(0);

  private activeKey: string | null = null;

  get currentStep(): TourStep | null {
    const steps = this.steps();
    return steps ? steps[this.currentIndex()] : null;
  }

  get isLastStep(): boolean {
    const steps = this.steps();
    return !!steps && this.currentIndex() === steps.length - 1;
  }

  startOrgTourIfNeeded(): void {
    this.startIfNeeded(ORG_TOUR_KEY, ORG_STEPS);
  }

  startCandidateTourIfNeeded(): void {
    this.startIfNeeded(CANDIDATE_TOUR_KEY, CANDIDATE_STEPS);
  }

  next(): void {
    if (this.isLastStep) {
      this.finish();
      return;
    }
    this.currentIndex.update((i) => i + 1);
  }

  prev(): void {
    this.currentIndex.update((i) => Math.max(0, i - 1));
  }

  finish(): void {
    if (this.activeKey) {
      localStorage.setItem(this.activeKey, 'true');
    }
    this.steps.set(null);
    this.currentIndex.set(0);
    this.activeKey = null;
  }

  private startIfNeeded(key: string, steps: TourStep[]): void {
    if (localStorage.getItem(key)) return;

    this.activeKey = key;
    this.currentIndex.set(0);
    this.steps.set(steps);
  }
}
