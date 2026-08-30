const express = require('express');
const { body } = require('express-validator');
const financeController = require('../controllers/financeController');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// Matches a plain positive decimal with at most 2 fraction digits — the only
// shape money fields accept. Never validated/parsed as a JS float.
const moneyValidator = (field) =>
  body(field)
    .matches(/^\d+(\.\d{1,2})?$/)
    .withMessage('errors.invalidAmount')
    .custom((value) => parseFloat(value) > 0)
    .withMessage('errors.amountMustBePositive');

const createValidation = [
  body('patientId').isInt().withMessage('errors.patientRequired'),
  body('title').trim().notEmpty().withMessage('errors.treatmentPlanTitleRequired'),
  moneyValidator('totalPrice'),
];

router.post('/', createValidation, validate, financeController.createTreatmentPlan);
router.put('/:id', financeController.updateTreatmentPlan);

module.exports = router;
