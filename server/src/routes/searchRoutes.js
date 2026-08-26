const express = require('express');
const searchController = require('../controllers/searchController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);
router.get('/', searchController.search);

module.exports = router;
