const express = require('express');
const { body } = require('express-validator');
const visitController = require('../controllers/visitController');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const createValidation = [
  body('patientId').isInt().withMessage('errors.patientRequired'),
  body('treatmentType').trim().notEmpty().withMessage('errors.treatmentRequired'),
];

router.post('/', createValidation, validate, visitController.create);
router.put('/:id', visitController.update);
router.get('/:id', visitController.getOne);

module.exports = router;
