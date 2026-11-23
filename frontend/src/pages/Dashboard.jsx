import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import { BarChart3, CalendarDays, CalendarCheck2, RotateCcw, Scissors, Sparkles, Users } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import DatePicker from '../components/ui/DatePicker.jsx';
import { useAppointments } from '../context/AppointmentsContext.jsx';
import { errorMessage } from '../services/api.js';
import { getAppointments } from '../services/appointmentService.js';
import { getClients, getProfessionals, getServices } from '../services/catalogService.js';
import { getConsolidatedDashboard } from '../services/dashboardService.js';

dayjs.extend(utc);

const monthRange = () => ({
  from: dayjs.utc().startOf('month').format('YYYY-MM-DD'),
  to: dayjs.utc().endOf('month').format('YYYY-MM-DD')
});

const STATUS_KEYS = { programada: 'programada', confirmada: 'confirmada', completada: 'completada', cancelada: 'cancelada', 'no asistió': 'no asistió' };
const EMPTY_RELATED = { appointments: [], professionals: [], clients: [], services: [] };

export default function Dashboard() {
  const { revision } = useAppointments();
  const lastRevision = useRef(revision);
  const [range, setRange] = useState(monthRange);
  const [data, setData] = useState(null);
  const [related, setRelated] = useState(EMPTY_RELATED);
  const [loading, setLoading] = useState(false);
  const [dashboardFailed, setDashboardFailed] = useState(false);

  const load = useCallback(async () => {
    if (!range.from || !range.to || range.from > range.to) {
      toast.error('La fecha inicial no puede ser posterior a la final');
      return;
    }
    setLoading(true);
    try {
      const [dashboardResponse, appointmentsResponse, professionalsResponse, clientsResponse, servicesResponse] = await Promise.all([
        getConsolidatedDashboard(range),
        getAppointments({ from: range.from, to: dayjs.utc(range.to).add(1, 'day').format('YYYY-MM-DD'), limit: 8 }),
        getProfessionals(),
        getClients({ limit: 100 }),
        getServices()
      ]);
      setData(dashboardResponse.data);
      setDashboardFailed(false);
      setRelated({
        appointments: appointmentsResponse.data?.items || [],
        professionals: (professionalsResponse.data || []).filter((item) => item.active !== false),
        clients: clientsResponse.data?.items || [],
        services: servicesResponse.data || []
      });
    } catch (error) {
      setDashboardFailed(true);
      toast.error(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (revision === lastRevision.current) return;
    lastRevision.current = revision;
    load();
  }, [revision, load]);

  const setField = (field) => (value) => setRange((current) => ({ ...current, [field]: value }));

  const nameOfService = (id) => related.services.find((service) => service.id === id)?.name || 'Servicio';
  const servicesOf = (professional) => (professional.services || []).map(nameOfService).join(', ') || 'Sin servicios asignados';
  const countOf = (id, ranking) => ranking?.find((item) => item.id === id)?.count || 0;

  const renderRanking = (items, label) => (
    <div>
      {(items || []).map((item, index) => (
        <div className="ranking-row" key={`${item.id}-${index}`}>
          <span className="ranking-rank">{item.rank ?? index + 1}</span>
          <Avatar name={item.name || label} size="sm" tone="muted" />
          <span className="ranking-row__name">{item.name}</span>
          <span className="ranking-row__count">{item.count} citas</span>
        </div>
      ))}
      {!items?.length && <p className="empty">Sin datos en el periodo seleccionado</p>}
    </div>
  );

  return (
    <>
      <PageHeader
        eyebrow="Negocio"
        title="Dashboard"
        subtitle="Citas, profesionales y clientes del salón en un solo lugar"
      />
      <div className="card">
        <div className="toolbar">
          <div className="field">
            <span className="field__label">Desde</span>
            <DatePicker value={range.from} onChange={setField('from')} placeholder="Fecha inicial" icon={CalendarDays} />
          </div>
          <div className="field">
            <span className="field__label">Hasta</span>
            <DatePicker value={range.to} onChange={setField('to')} placeholder="Fecha final" icon={CalendarDays} />
          </div>
          <button className="button" onClick={load} disabled={loading}>
            <BarChart3 size={15} strokeWidth={1.75} />
            {loading ? 'Actualizando…' : 'Aplicar periodo'}
          </button>
          <button className="button button--ghost" onClick={() => setRange(monthRange())}>
            <RotateCcw size={15} strokeWidth={1.75} /> Este mes
          </button>
        </div>
        {data?.period && (
          <p className="muted" style={{ fontSize: 12, marginTop: 16 }}>
            Periodo consultado: <strong>{dayjs.utc(data.period.from).format('D MMM YYYY')}</strong> — <strong>{dayjs.utc(data.period.to).format('D MMM YYYY')}</strong>
          </p>
        )}
      </div>

      {!dashboardFailed && (
        <div className="grid grid-4 section-spaced">
          <div className="kpi">
            <div className="kpi__top">
              <span className="kpi-label">Total de citas</span>
              <span className="kpi__icon"><CalendarCheck2 size={18} strokeWidth={1.75} /></span>
            </div>
            <div className="kpi-value">{data?.totalAppointments ?? 0}</div>
            <div className="kpi-hint">Citas registradas en el periodo</div>
          </div>
          <div className="kpi">
            <div className="kpi__top">
              <span className="kpi-label">Servicios solicitados</span>
              <span className="kpi__icon"><Sparkles size={18} strokeWidth={1.75} /></span>
            </div>
            <div className="kpi-value">{data?.topServices?.length ?? 0}</div>
            <div className="kpi-hint">Servicios con al menos una cita</div>
          </div>
          <div className="kpi">
            <div className="kpi__top">
              <span className="kpi-label">Clientes recurrentes</span>
              <span className="kpi__icon"><Users size={18} strokeWidth={1.75} /></span>
            </div>
            <div className="kpi-value">{data?.topClients?.length ?? 0}</div>
            <div className="kpi-hint">Clientes con al menos una cita</div>
          </div>
          <div className="kpi">
            <div className="kpi__top">
              <span className="kpi-label">Profesionales activos</span>
              <span className="kpi__icon"><Scissors size={18} strokeWidth={1.75} /></span>
            </div>
            <div className="kpi-value">{related.professionals.length}</div>
            <div className="kpi-hint">Equipo con servicios asignados</div>
          </div>
        </div>
      )}

      {data?.byStatus && Object.keys(data.byStatus).length > 0 && (
        <div className="card section-spaced">
          <div className="card__header">
            <div>
              <span className="eyebrow">Estado de las reservas</span>
              <div className="card-title" style={{ marginTop: 4 }}>Distribución por estado</div>
            </div>
          </div>
          <div className="row-actions" style={{ gap: 8 }}>
            {Object.entries(data.byStatus).map(([status, total]) => (
              <StatusBadge key={status} status={STATUS_KEYS[status] || status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}: {total}
              </StatusBadge>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-2 section-spaced">
        <div className="card">
          <div className="card__header">
            <div>
              <span className="eyebrow">Ranking</span>
              <div className="card-title" style={{ marginTop: 4 }}>Servicios más solicitados</div>
            </div>
          </div>
          {renderRanking(data?.topServices, 'Servicio')}
        </div>
        <div className="card">
          <div className="card__header">
            <div>
              <span className="eyebrow">Ranking</span>
              <div className="card-title" style={{ marginTop: 4 }}>Clientes frecuentes</div>
            </div>
          </div>
          {renderRanking(data?.topClients, 'Cliente')}
        </div>
      </div>

      <div className="card section-spaced">
        <div className="card__header">
          <div>
            <span className="eyebrow">Operación del salón</span>
            <div className="card-title" style={{ marginTop: 4 }}>Últimas citas del periodo</div>
          </div>
          <Link className="button button--ghost" to="/citas">Ver todas las citas</Link>
        </div>
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table>
            <thead>
              <tr><th>Cliente</th><th>Profesional</th><th>Servicio</th><th>Inicio</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {related.appointments.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="cell-person">
                      <Avatar name={item.clientName || 'Cliente'} size="sm" tone="muted" />
                      <div className="cell-person__meta">
                        <strong>{item.clientName || 'Cliente'}</strong>
                        <small>{item.clientEmail || 'Reserva del salón'}</small>
                      </div>
                    </div>
                  </td>
                  <td>{item.professionalName || '—'}</td>
                  <td>{item.serviceName || '—'}</td>
                  <td><span className="date-link">{dayjs.utc(item.start).format('DD/MM HH:mm')}</span></td>
                  <td><StatusBadge status={item.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!related.appointments.length && <p className="empty">No hay citas en el periodo seleccionado.</p>}
      </div>

      <div className="grid grid-2 section-spaced">
        <div className="card">
          <div className="card__header">
            <div>
              <span className="eyebrow">Equipo</span>
              <div className="card-title" style={{ marginTop: 4 }}>Profesionales y sus servicios</div>
            </div>
            <Link className="button button--soft" to="/profesionales">Gestionar</Link>
          </div>
          {related.professionals.map((professional) => (
            <div className="detail-row" key={professional.id}>
              <div className="cell-person">
                <Avatar name={`${professional.firstName} ${professional.lastName}`} size="sm" tone="muted" />
                <div className="cell-person__meta">
                  <strong>{`${professional.firstName} ${professional.lastName}`.trim()}</strong>
                  <small>{professional.specialty || 'Profesional del salón'}</small>
                  <small>{servicesOf(professional)}</small>
                </div>
              </div>
              <span className="badge">{countOf(professional.id, data?.topProfessionals)} citas</span>
            </div>
          ))}
          {!related.professionals.length && <p className="empty">No hay profesionales registrados.</p>}
        </div>

        <div className="card">
          <div className="card__header">
            <div>
              <span className="eyebrow">Clientela</span>
              <div className="card-title" style={{ marginTop: 4 }}>Clientes y su actividad</div>
            </div>
            <Link className="button button--soft" to="/clientes">Gestionar</Link>
          </div>
          {related.clients.map((client) => (
            <div className="detail-row" key={client.id}>
              <div className="cell-person">
                <Avatar name={`${client.firstName} ${client.lastName}`} size="sm" tone="muted" />
                <div className="cell-person__meta">
                  <strong>{`${client.firstName} ${client.lastName}`.trim()}</strong>
                  <small>{client.email || client.document || 'Cliente'}</small>
                </div>
              </div>
              <span className="badge">{countOf(client.id, data?.topClients)} citas</span>
            </div>
          ))}
          {!related.clients.length && <p className="empty">No hay clientes registrados.</p>}
        </div>
      </div>
    </>
  );
}
