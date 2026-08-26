const express = require('express');
const exportController = require('../controllers/exportController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/today-appointments', exportController.todaysAppointments);
router.get('/patients/:id/history', exportController.patientHistory);

module.exports = router;
