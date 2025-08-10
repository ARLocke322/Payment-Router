const { sequelize } = require('./database');

const executePayment = async ({ quote_id, payment_method_id }) => {
    console.log(`🔄 Executing payment for quote ${quote_id} using method ${payment_method_id}`);

    // Lookup original quote data
    const [quotes] = await sequelize.query(`
    SELECT id, source_currency, target_currency, source_amount, exchange_rate, expires_at, status, created_at, target_amount
    FROM quotes
    WHERE id = ?
    AND status = 'active'
    AND expires_at > NOW()
  `, {
        replacements: [quote_id]
    });

    if (quotes.length === 0) {
        throw new Error('Quote not found, expired, or already used');
    }

    const [routes] = await sequelize.query(`
    SELECT id, quote_id, payment_method_id, estimated_cost, estimated_time_hours, score
    FROM quote_routes
    WHERE quote_id = ?
    AND payment_method_id = ?
  ` , {
        replacements: [quote_id, payment_method_id]
    });

    if (routes.length === 0) {
        throw new Error('Selected payment method not available for this quote');
    }

    const quote = quotes[0];
    const selectedRoute = routes[0];

    // Update quote
    await sequelize.query(`
    UPDATE quotes
    SET status = 'used'
    WHERE id = ?
  ` , {
        replacements: [quote_id]
    });

    console.log('🔍 From database:', quote.target_amount);


    // Create transaction record
    const transactionId = require('crypto').randomUUID();

    // Insert transaction
    await sequelize.query(`
        INSERT INTO transactions (id, source_currency, target_currency, source_amount, target_amount, status, quote_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
`, {
        replacements: [
            transactionId,
            quote.source_currency,
            quote.target_currency,
            quote.source_amount,
            quote.target_amount,
            'pending',
            quote_id
        ]
    });

    console.log(`✅ Created transaction ${transactionId}`);

    // Create route record
    const routeId = require('crypto').randomUUID();

    // Insert route
    await sequelize.query(`
        INSERT INTO routes (id, transaction_id, payment_method_id, estimated_cost, estimated_time_hours, exchange_rate, score, is_selected)
        VALUES (?, ?, ?, ?, ?, ?, ?, true)
`, {
        replacements: [
            routeId,
            transactionId,
            payment_method_id,
            selectedRoute.estimated_cost,
            selectedRoute.estimated_time_hours,
            quote.exchange_rate,
            selectedRoute.score,
        ]
    });



    // Simulate payment provider call
    const providerResponse = await mockPaymentProvider(selectedRoute, quote);
    console.log(`💳 Provider response:`, providerResponse);

    // Update transaction status based on provider response
    if (providerResponse.status === 'failed') {
        await sequelize.query(`
        UPDATE transactions 
        SET status = 'failed' 
        WHERE id = ?
  `    , {
            replacements: [transactionId]
        });
    }

    // Return transaction details to customer
    return {
        transaction_id: transactionId,
        status: providerResponse.status,
        quote_id,
        payment_method_id,
        source_amount: quote.source_amount,
        target_amount: quote.target_amount,
        exchange_rate: quote.exchange_rate,
        provider_reference: providerResponse.reference,
        message: providerResponse.message
    };
};

const mockPaymentProvider = async (selectedRoute, quote) => {
    console.log(`💳 Simulating payment provider call...`);

    // Random success/failure (80% success rate)
    const isSuccess = Math.random() > 0.2;

    if (isSuccess) {
        return {
            status: 'processing',
            reference: `PAY_${Date.now()}`,
            message: 'Payment initiated successfully'
        };
    } else {
        return {
            status: 'failed',
            reference: null,
            message: 'Payment rejected by provider'
        };
    }
};

module.exports = {
    executePayment
};