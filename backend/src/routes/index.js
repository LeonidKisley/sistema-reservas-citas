import { Router } from 'express';
import tenantRoutes from './tenantRoutes.js';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import clientRoutes from './clientRoutes.js';
import professionalRoutes from './professionalRoutes.js';
import serviceRoutes from './serviceRoutes.js';
import availabilityRoutes from './availabilityRoutes.js';
import appointmentRoutes from './appointmentRoutes.js';
import agendaRoutes from './agendaRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import platformRoutes from './platformRoutes.js';

const router = Router();

router.use('/tenants', tenantRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/clients', clientRoutes);
router.use('/professionals', professionalRoutes);
router.use('/services', serviceRoutes);
router.use('/availability', availabilityRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/agenda', agendaRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/platform', platformRoutes);

export default router;
