const quotesService = require('../services/quotesService');

const createQuote = async (req, res) => {
    try {
        console.log('📝 Quote request received:', req.body);

        // Input validation - CRITICAL in financial APIs
        const { source_currency, target_currency, source_amount } = req.body;

        // Validate required fields
        if (!source_currency || !target_currency || !source_amount) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                required: ['source_currency', 'target_currency', 'source_amount']
            });
        }

        // Validate amount is positive
        if (source_amount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Amount must be greater than zero'
            });
        }

        // Call business logic service
        const quote = await quotesService.generateQuote({
            source_currency,
            target_currency,
            source_amount
        });

        res.json({
            success: true,
            quote
        });

    } catch (error) {
        console.error('❌ Quote generation failed:', error.message);

        res.status(500).json({
            success: false,
            error: 'Failed to generate quote',
            details: error.message
        });
    }
};

module.exports = {
    createQuote
};