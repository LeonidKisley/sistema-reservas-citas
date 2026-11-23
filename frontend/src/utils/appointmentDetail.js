import Swal from 'sweetalert2';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { errorMessage } from '../services/api.js';
import { cancelAppointment } from '../services/appointmentService.js';

const escapeHtml = (value) => String(value ?? '—').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

const formatMoment = (value) => (value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '—');

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
    </div>
  `;

  const detail = await Swal.fire({
    title: appointment.isMine ? 'Tu horario reservado' : 'Horario reservado',
    html,
    width: 520,
    showCloseButton: true,
    showConfirmButton: false,
    showDenyButton: canCancel,
    denyButtonText: 'Cancelar cita',
    denyButtonColor: '#A84E60'
  });

  if (!detail.isDenied) return;

  const confirmation = await Swal.fire({
    title: '¿Cancelar la cita?',
    text: `${appointment.serviceName || 'Cita'} · ${appointment.start ? formatMoment(appointment.start) : appointment.startTime || ''}`,
    input: 'textarea',
    inputPlaceholder: 'Motivo de cancelación (opcional)',
    icon: 'warning',
    iconColor: '#C26476',
    showCancelButton: true,
    confirmButtonText: 'Sí, cancelar',
    cancelButtonText: 'Volver',
    confirmButtonColor: '#A84E60',
    cancelButtonColor: '#A99A9F'
  });

  if (!confirmation.isConfirmed) return;

  try {
    const response = await cancelAppointment(appointment.id, { reason: confirmation.value || undefined });
    toast.success(response.data?.message || 'Cita cancelada; el horario quedó libre');
    onCanceled?.();
  } catch (error) {
    toast.error(errorMessage(error));
  }
}
