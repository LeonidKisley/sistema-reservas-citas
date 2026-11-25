export default function MonthlyAppointmentsChart({ series = [], emptyMessage = 'Sin datos en el periodo seleccionado' }) {
  const total = series.reduce((sum, item) => sum + Number(item.count || 0), 0);
  const ariaLabel = `Citas por mes: ${series.map(({ label, count }) => `${label} ${count}`).join(', ')}`;

  if (!total) return <p className="empty">{emptyMessage}</p>;

  return (
    <div className="monthly-chart" role="img" aria-label={ariaLabel}>
      {series.map(({ key, label, count, height }) => (
        <div className="monthly-chart__item" key={key}>
          <span className="monthly-chart__value">{count}</span>
          <div className="monthly-chart__track">
            <div
              className="monthly-chart__bar"
              style={{ height: `${height}%` }}
              title={`${label}: ${count} citas`}
              aria-label={`${label}: ${count} citas`}
            />
          </div>
          <span className="monthly-chart__label">{label}</span>
        </div>
      ))}
    </div>
  );
}
