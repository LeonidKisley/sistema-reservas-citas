import Swal from 'sweetalert2';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { errorMessage, successMessage } from '../services/api.js';
import { cancelAppointment } from '../services/appointmentService.js';
import { LOTUS_CENTER, LOTUS_PATHS } from '../components/ui/lotusPaths.js';

const escapeHtml = (value) => String(value ?? '—').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

const formatMoment = (value) => (value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '—');

const lotusSvg = () => `
  <svg class="lotus-flower" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    ${LOTUS_PATHS.map((petal) => `<path class="${petal.className}" d="${petal.d}" />`).join('')}
    <circle class="lotus-flower__center" cx="${LOTUS_CENTER.cx}" cy="${LOTUS_CENTER.cy}" r="${LOTUS_CENTER.r}" />
  </svg>
`;

export async function openAppointmentDetail({ appointment, canCancel = false, onCanceled }) {
  const rows = [
    ['Reservado por', appointment.isMine ? 'Tí' : appointment.clientName],
    ['Profesional', appointment.professionalName],
    ['Servicio', appointment.serviceName],
    ['Inicio', appointment.start ? formatMoment(appointment.start) : appointment.startTime],
    ['Fin', appointment.end ? formatMoment(appointment.end) : appointment.endTime],
    ['Estado', appointment.status],
    ['Notas', appointment.notes]
  ];
  const html = `
    <div class="appointment-detail">
      <div class="appointment-detail__tag ${appointment.isMine ? 'appointment-detail__tag--mine' : ''}">
        ${appointment.isMine ? 'Reservado por ti' : `Reservado por ${escapeHtml(appointment.clientName || 'otro cliente')}`}
      </div>
      <div class="appointment-detail__rows">
        ${rows.map(([label, value]) => `<div><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</div>`).join('')}
      </div>
      <div class="appointment-detail__lotus-garden" aria-hidden="true">
        <span class="appointment-detail__lotus appointment-detail__lotus--left">${lotusSvg()}</span>
        <span class="appointment-detail__lotus appointment-detail__lotus--center">${lotusSvg()}</span>
        <span class="appointment-detail__lotus appointment-detail__lotus--right">${lotusSvg()}</span>
      </div>
    </div>
  `;

  const themeColor = (name, fallback) => (
    typeof window === 'undefined'
      ? fallback
      : getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
  );

  const detail = await Swal.fire({
    title: appointment.isMine ? 'Tu horario reservado' : 'Horario reservado',
    html,
    width: 520,
    showCloseButton: true,
    showConfirmButton: false,
    showDenyButton: canCancel,
    denyButtonText: 'Cancelar cita',
    denyButtonColor: themeColor('--primary-dark', '#A84E60')
  });

  if (!detail.isDenied) return;

  const confirmation = await Swal.fire({
    title: '¿Cancelar la cita?',
    text: `${appointment.serviceName || 'Cita'} · ${appointment.start ? formatMoment(appointment.start) : appointment.startTime || ''}`,
    input: 'textarea',
    inputPlaceholder: 'Motivo de cancelación (opcional)',
    icon: 'warning',
    iconColor: themeColor('--primary', '#C26476'),
    showCancelButton: true,
    confirmButtonText: 'Sí, cancelar',
    cancelButtonText: 'Volver',
    confirmButtonColor: themeColor('--primary-dark', '#A84E60'),
    cancelButtonColor: themeColor('--muted', '#A99A9F')
  });

  if (!confirmation.isConfirmed) return;

  try {
    const response = await cancelAppointment(appointment.id, { reason: confirmation.value || undefined });
    toast.success(successMessage(response, 'Cita cancelada; el horario quedó libre'));
    onCanceled?.();
  } catch (error) {
    toast.error(errorMessage(error));
  }
}
