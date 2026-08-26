const express = require('express');
const { body, query } = require('express-validator');
const appointmentController = require('../controllers/appointmentController');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const createValidation = [
  body('patientId').isInt().withMessage('errors.patientRequired'),
  body('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('errors.invalidDate'),
  body('startTime').matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('errors.invalidTime'),
  body('duration').isInt({ min: 5, max: 480 }).withMessage('errors.invalidDuration'),
  body('treatmentType').trim().notEmpty().withMessage('errors.treatmentRequired'),
];

router.get('/', [query('from').notEmpty(), query('to').notEmpty()], validate, appointmentController.list);
router.get('/:id', appointmentController.getOne);
router.post('/', createValidation, validate, appointmentController.create);
router.put('/:id', appointmentController.update);
router.patch('/:id/status', body('status').notEmpty(), validate, appointmentController.setStatus);
router.post('/:id/cancel', appointmentController.cancel);

module.exports = router;
