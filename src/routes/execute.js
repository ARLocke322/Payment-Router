const express = require('express');
const router = express.Router();
const executeController = require('../controllers/executeController');

// POST /api/quotes - Get payment route options
router.post('/', executeController.executePayment);

module.exports = router;