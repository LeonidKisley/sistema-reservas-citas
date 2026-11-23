import { describe, expect, it } from 'vitest';
import { buildExcelCsv, buildReportHtml, escapeHtml, reportRows, toCsv } from './reportExport.js';

const options = {
  title: 'Dashboard & Reservas',
  subtitle: 'Informe <mensual>',
  period: '2026-11-01 — 2026-11-30',
  sections: [
    {
      title: 'Indicadores',
      columns: ['Indicador', 'Valor'],
      rows: [['Total de citas', 12]]
    },
    {
      title: 'Distribución',
      columns: ['Estado', 'Citas'],
      rows: [['cancelada', 2]]
    }
  ]
};

describe('reportExport', () => {
  it('escapa HTML', () => {
    expect(escapeHtml(`<script>"&'</script>`)).toBe('&lt;script&gt;&quot;&amp;&#39;&lt;/script&gt;');
    expect(escapeHtml(null)).toBe('');
  });

  it('genera CSV con BOM, separador y comillas dobles', () => {
    expect(toCsv([['a', 'b'], ['x"y', 'línea\nnueva']]))
      .toBe('"a";"b"\r\n"x""y";"línea\nnueva"');
    expect(buildExcelCsv(options).startsWith('\uFEFF')).toBe(true);
  });

  it('construye filas solo con el periodo y las secciones', () => {
    const rows = reportRows(options);
    expect(rows[0]).toEqual([options.title]);
    expect(rows).toContainEqual([`Periodo: ${options.period}`]);
    expect(rows).toContainEqual(['Indicador', 'Valor']);
    expect(rows).toContainEqual(['Total de citas', 12]);
  });

  it('escapa los datos dinámicos en el documento de impresión', () => {
    const html = buildReportHtml(options);
    expect(html).toContain('Dashboard &amp; Reservas');
    expect(html).toContain('Informe &lt;mensual&gt;');
    expect(html).toContain(options.period);
    expect(html).toContain('<th>Indicador</th>');
    expect(html).toContain('<td>Total de citas</td>');
  });
});
