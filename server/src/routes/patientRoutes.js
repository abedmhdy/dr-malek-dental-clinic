const express = require('express');
const { body } = require('express-validator');
const patientController = require('../controllers/patientController');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const patientValidation = [
  body('firstName').trim().notEmpty().withMessage('errors.firstNameRequired'),
  body('lastName').trim().notEmpty().withMessage('errors.lastNameRequired'),
  body('phone').trim().notEmpty().withMessage('errors.phoneRequired'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('errors.invalidEmail'),
  body('dateOfBirth')
    .optional({ checkFalsy: true })
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('errors.invalidDate'),
];

router.get('/', patientController.list);
router.get('/check-duplicates', patientController.checkDuplicates);
router.post('/', patientValidation, validate, patientController.create);
router.get('/:id', patientController.getOne);
router.put('/:id', patientValidation, validate, patientController.update);
router.delete('/:id', patientController.archive);
router.get('/:id/appointments', patientController.appointments);
router.get('/:id/visits', patientController.visits);

module.exports = router;
