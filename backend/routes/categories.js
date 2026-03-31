const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getCategories, createCategory } = require('../controllers/categoryController');

router.get('/', getCategories);
router.post('/', authenticate, authorize('admin'), createCategory);

module.exports = router;