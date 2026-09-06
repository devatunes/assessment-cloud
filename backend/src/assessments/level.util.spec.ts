import { computeLevel } from './level.util';

describe('computeLevel', () => {
  const thresholds = { junior: 40, semisenior: 70, senior: 90 };

  it('devuelve null si no hay umbrales configurados', () => {
    expect(computeLevel(95, null)).toBeNull();
    expect(computeLevel(95, undefined)).toBeNull();
  });

  it('devuelve null si el score no alcanza ni el umbral más bajo', () => {
    expect(computeLevel(20, thresholds)).toBeNull();
  });

  it('devuelve JUNIOR justo en el umbral', () => {
    expect(computeLevel(40, thresholds)).toBe('JUNIOR');
    expect(computeLevel(69, thresholds)).toBe('JUNIOR');
  });

  it('devuelve SEMISENIOR en el rango correspondiente', () => {
    expect(computeLevel(70, thresholds)).toBe('SEMISENIOR');
    expect(computeLevel(89, thresholds)).toBe('SEMISENIOR');
  });

  it('devuelve SENIOR en el rango más alto', () => {
    expect(computeLevel(90, thresholds)).toBe('SENIOR');
    expect(computeLevel(100, thresholds)).toBe('SENIOR');
  });

  it('respeta umbrales parcialmente configurados', () => {
    expect(computeLevel(95, { senior: 90 })).toBe('SENIOR');
    expect(computeLevel(50, { senior: 90 })).toBeNull();
  });
});
