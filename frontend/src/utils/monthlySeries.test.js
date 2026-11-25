import { describe, expect, it } from 'vitest';
import { MONTHLY_APPOINTMENT_MONTHS, buildMonthlySeries } from './monthlySeries.js';

describe('buildMonthlySeries', () => {
  it('usa los meses fijos de Ago 26 a Ene 27', () => {
    const series = buildMonthlySeries();

    expect(series.map(({ key }) => key)).toEqual([
      '2026-08', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01'
    ]);
    expect(series.map(({ label }) => label)).toEqual([
      'Ago 26', 'Sep 26', 'Oct 26', 'Nov 26', 'Dic 26', 'Ene 27'
    ]);
    expect(MONTHLY_APPOINTMENT_MONTHS[0].from).toBe('2026-08-01');
    expect(MONTHLY_APPOINTMENT_MONTHS[5].to).toBe('2027-01-31');
  });

  it('escala las alturas respecto al mes con más citas', () => {
    const series = buildMonthlySeries([10, 0, 5, 20, 15, 0]);

    expect(series.map(({ height }) => height)).toEqual([50, 0, 25, 100, 75, 0]);
    expect(buildMonthlySeries([0, 0, 0, 0, 0, 0]).every(({ height }) => height === 0)).toBe(true);
  });

  it('acepta respuestas del servicio de dashboard', () => {
    const series = buildMonthlySeries([
      { data: { total: 3 } },
      { data: { total: 1 } },
      { data: { total: 4 } },
      { data: { total: 2 } },
      { data: { total: 6 } },
      { data: { total: 5 } }
    ]);

    expect(series.map(({ count }) => count)).toEqual([3, 1, 4, 2, 6, 5]);
    expect(series[4].height).toBe(100);
  });
});
