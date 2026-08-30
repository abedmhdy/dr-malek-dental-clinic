const express = require('express');
const { body } = require('express-validator');
const financeController = require('../controllers/financeController');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const moneyValidator = (field) =>
  body(field)
    .matches(/^\d+(\.\d{1,2})?$/)
    .withMessage('errors.invalidAmount')
    .custom((value) => parseFloat(value) > 0)
    .withMessage('errors.amountMustBePositive');

const createValidation = [
  body('patientId').isInt().withMessage('errors.patientRequired'),
  body('treatmentPlanId').isInt().withMessage('errors.treatmentPlanRequired'),
  moneyValidator('amount'),
  body('paymentDate').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('errors.invalidDate'),
];

const updateValidation = [
  body('amount').optional().matches(/^\d+(\.\d{1,2})?$/).withMessage('errors.invalidAmount'),
  body('paymentDate').optional().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('errors.invalidDate'),
];

const voidValidation = [body('reason').trim().notEmpty().withMessage('errors.voidReasonRequired')];

router.post('/', createValidation, validate, financeController.createPayment);
router.put('/:id', updateValidation, validate, financeController.updatePayment);
router.post('/:id/void', voidValidation, validate, financeController.voidPayment);

module.exports = router;
