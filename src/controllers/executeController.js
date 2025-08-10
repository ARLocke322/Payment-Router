const executeService = require('../services/executeService');

const executePayment = async (req, res) => {
    try {
        console.log('🔧 Execution request received:', req.body);

        // What do I need from req.body?
        const {
            quote_id,
            payment_method_id,
        } = req.body;

        // What validations should I do first?
        if (!quote_id) {
            return res.status(400).json({
                success: false,
                error: 'Missing Quote ID'
            });
        }
        if (!payment_method_id) {
            return res.status(400).json({
                success: false,
                error: 'Missing payment_method_id'
            });
        }
        // What service function should I call?
        const transaction = await executeService.executePayment({
            quote_id,
            payment_method_id
        });

        // What should I return if successful?
        res.json({
            success: true,
            transaction
        });


        // What should I return if it fails?
    } catch (error) {
        console.error('❌ Execution failed:', error.message);

        res.status(500).json({
            success: false,
            error: 'Failed to execute payment',
            details: error.message
        });
    }
}

module.exports = {
    executePayment
};