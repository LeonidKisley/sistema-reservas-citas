const HTML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);

const escapeCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export function reportRows({ title, subtitle, period, sections = [] }) {
  const rows = [[title]];
  if (subtitle) rows.push([subtitle]);
  rows.push([`Periodo: ${period}`], []);
  sections.forEach((section) => {
    rows.push([section.title], section.columns || [], ...(section.rows || []), []);
  });
  return rows;
}

export function toCsv(rows = []) {
  return rows.map((row) => row.map(escapeCsv).join(';')).join('\r\n');
}

export function buildExcelCsv(options) {
  return `\uFEFF${toCsv(reportRows(options))}`;
}

export function buildReportHtml({ title, subtitle, period, sections = [] }) {
  const sectionsHtml = sections.map((section) => {
    const columns = (section.columns || []).map((column) => `<th>${escapeHtml(column)}</th>`).join('');
    const rows = (section.rows || []).map((row) => (
      `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`
    )).join('');
    return `
      <section>
        <h2>${escapeHtml(section.title)}</h2>
        <table>
          <thead><tr>${columns}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </section>
    `;
  }).join('');

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      --primary: #C26476; --primary-dark: #A84E60; --champagne: #F5EDE8;
      --border: #EAE3DD; --text: #23191D; --muted: #6E6267; --surface-soft: #FDFAF8;
    }
    @page { size: A4; margin: 16mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: var(--text); font: 12px/1.5 system-ui, sans-serif; }
    header { margin-bottom: 22px; padding-bottom: 14px; border-bottom: 2px solid var(--primary); }
    h1 { margin: 0; font-size: 24px; color: var(--primary-dark); }
    h2 { margin: 22px 0 8px; font-size: 13px; color: var(--primary-dark); }
    p { margin: 4px 0 0; color: var(--muted); }
    section { break-inside: avoid; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 7px 9px; border: 1px solid var(--border); text-align: left; }
    th { background: var(--champagne); font-size: 10px; letter-spacing: .08em; text-transform: uppercase; }
    tbody tr:nth-child(even) { background: var(--surface-soft); }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(title)}</h1>
    ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}
    <p>${escapeHtml(period)}</p>
  </header>
  ${sectionsHtml}
</body>
</html>`;
}

export function downloadExcelCsv({ filename = 'reporte.csv', ...options }) {
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') return false;
  const blob = new Blob([buildExcelCsv(options)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return true;
}

export function printReport(options) {
  if (typeof window === 'undefined' || typeof window.open !== 'function') return false;
  const printWindow = window.open('', '_blank', 'width=1024,height=768');
  if (!printWindow) return false;
  printWindow.document.open();
  printWindow.document.write(buildReportHtml(options));
  printWindow.document.close();
  printWindow.focus();
  printWindow.setTimeout(() => printWindow.print(), 250);
  return true;
}
