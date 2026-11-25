export const MONTHLY_APPOINTMENT_MONTHS = Object.freeze([
  { key: '2026-08', label: 'Ago 26', from: '2026-08-01', to: '2026-08-31' },
  { key: '2026-09', label: 'Sep 26', from: '2026-09-01', to: '2026-09-30' },
  { key: '2026-10', label: 'Oct 26', from: '2026-10-01', to: '2026-10-31' },
  { key: '2026-11', label: 'Nov 26', from: '2026-11-01', to: '2026-11-30' },
  { key: '2026-12', label: 'Dic 26', from: '2026-12-01', to: '2026-12-31' },
  { key: '2027-01', label: 'Ene 27', from: '2027-01-01', to: '2027-01-31' }
]);

function countOf(value) {
  const count = typeof value === 'number'
    ? value
    : value?.data?.total ?? value?.total ?? 0;
  const parsed = Number(count);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
}

export function buildMonthlySeries(responses = []) {
  const counts = MONTHLY_APPOINTMENT_MONTHS.map((month, index) => {
    const value = Array.isArray(responses) ? responses[index] : responses?.[month.key];
    return countOf(value);
  });
  const max = Math.max(0, ...counts);

  return MONTHLY_APPOINTMENT_MONTHS.map((month, index) => ({
    ...month,
    count: counts[index],
    height: counts[index] === 0 ? 0 : Math.max(2, Math.round((counts[index] / max) * 100))
  }));
}
