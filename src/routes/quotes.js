const express = require('express');
const router = express.Router();
const quotesController = require('../controllers/quotesController');

// POST /api/quotes - Get payment route options
router.post('/', quotesController.createQuote);

module.exports = router;