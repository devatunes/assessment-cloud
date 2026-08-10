import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaginatorComponent } from './paginator.component';

describe('PaginatorComponent', () => {
  let fixture: ComponentFixture<PaginatorComponent>;
  let component: PaginatorComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaginatorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PaginatorComponent);
    component = fixture.componentInstance;
  });

  it('no renderiza nada si todo cabe en una sola página', () => {
    component.total = 15;
    component.pageSize = 20;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('nav.paginator')).toBeNull();
  });

  it('renderiza y calcula el total de páginas cuando hay más de una', () => {
    component.total = 45;
    component.pageSize = 20;
    component.page = 2;
    fixture.detectChanges();

    expect(component.totalPages).toBe(3);
    const label = fixture.nativeElement.querySelector('.paginator-label').textContent;
    expect(label).toContain('Página 2 de 3');
    expect(label).toContain('45 en total');
  });

  it('emite pageChange al hacer clic en "Siguiente" dentro de rango', () => {
    component.total = 45;
    component.pageSize = 20;
    component.page = 1;
    fixture.detectChanges();

    const emitted: number[] = [];
    component.pageChange.subscribe((p) => emitted.push(p));

    const [, next] = fixture.nativeElement.querySelectorAll('button');
    next.click();

    expect(emitted).toEqual([2]);
  });

  it('no emite pageChange fuera de rango ni en la página actual', () => {
    component.total = 45;
    component.pageSize = 20;
    component.page = 1;

    const emitted: number[] = [];
    component.pageChange.subscribe((p) => emitted.push(p));

    component.goTo(0); // fuera de rango por abajo
    component.goTo(4); // fuera de rango por arriba (totalPages = 3)
    component.goTo(1); // misma página actual

    expect(emitted).toEqual([]);
  });
});
