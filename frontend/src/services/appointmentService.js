import api from './api.js';

export const getAppointments = (params) => api.get('/appointments', { params });
export const getAppointment = (id) => api.get(`/appointments/${id}`);
export const createAppointment = (payload) => api.post('/appointments', payload);
export const rescheduleAppointment = (id, payload) => api.patch(`/appointments/${id}/reschedule`, payload);
export const cancelAppointment = (id, payload) => api.patch(`/appointments/${id}/cancel`, payload);
export const updateAppointmentStatus = (id, status) => api.patch(`/appointments/${id}/status`, { status });

export const getAvailability = (params) => api.get('/availability', { params });
export const getRecommendedProfessionals = (params) => api.get('/availability/recommended', { params });
export const getAgenda = (params) => api.get('/agenda', { params });
export const getDailyAgenda = (params) => api.get('/agenda/daily', { params });

export const professionalOffersService = (professional, serviceId) => Boolean(
  professional && serviceId && (professional.services || []).map(String).includes(String(serviceId))
);

export function rankProfessionalsByService(professionals = [], serviceId, recommended = []) {
  const qualified = serviceId
    ? professionals.filter((professional) => professionalOffersService(professional, serviceId))
    : [...professionals];
  const availableIds = recommended.map((item) => String(item.id));
  const recommendedIds = availableIds.slice(0, 3);
  const topSet = new Set(recommendedIds);
  const byId = new Map(qualified.map((professional) => [String(professional.id), professional]));

  const rest = qualified
    .filter((professional) => !topSet.has(String(professional.id)))
    .sort((a, b) => {
      const aIndex = availableIds.indexOf(String(a.id));
      const bIndex = availableIds.indexOf(String(b.id));
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'es');
    });

  return {
    ordered: [...recommendedIds.map((id) => byId.get(id)).filter(Boolean), ...rest],
    recommendedIds,
    availableIds
  };
}
