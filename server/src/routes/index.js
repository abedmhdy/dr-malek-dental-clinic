const express = require('express');

const authRoutes = require('./authRoutes');
const patientRoutes = require('./patientRoutes');
const appointmentRoutes = require('./appointmentRoutes');
const visitRoutes = require('./visitRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const searchRoutes = require('./searchRoutes');
const settingsRoutes = require('./settingsRoutes');
const exportRoutes = require('./exportRoutes');
const treatmentPlanRoutes = require('./treatmentPlanRoutes');
const paymentRoutes = require('./paymentRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/patients', patientRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/visits', visitRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/search', searchRoutes);
router.use('/settings', settingsRoutes);
router.use('/export', exportRoutes);
router.use('/treatment-plans', treatmentPlanRoutes);
router.use('/payments', paymentRoutes);

module.exports = router;
