const { sequelize } = require('./database');

const generateQuote = async ({ source_currency, target_currency, source_amount }) => {
    console.log(`💱 Generating quote: ${source_amount} ${source_currency} → ${target_currency}`);

    // Validate currencies exist and are active
    const [currencies] = await sequelize.query(`
    SELECT code, decimal_places 
    FROM currencies 
    WHERE code IN (?, ?) AND is_active = true
  `, {
        replacements: [source_currency, target_currency]
    });

    if (currencies.length !== 2) {
        throw new Error(`Invalid or inactive currency codes`);
    }

    // Get current exchange rate (mock)
    const exchangeRate = await getMockExchangeRate(source_currency, target_currency);
    const targetAmount = (source_amount * exchangeRate).toFixed(8);

    // Get available payment methods
    const [paymentMethods] = await sequelize.query(`
    SELECT id, name, type, min_amount, max_amount, avg_settlement_hours, fee_percentage
    FROM payment_methods 
    WHERE is_active = true 
    AND min_amount <= ? 
    AND max_amount >= ?
    ORDER BY avg_settlement_hours
  `, {
        replacements: [source_amount, source_amount]
    });

    if (paymentMethods.length === 0) {
        throw new Error(`No payment methods available for amount ${source_amount}`);
    }

    // Calculate costs and routes for each method
    const routes = paymentMethods.map(method => {
        const feeAmount = source_amount * method.fee_percentage;
        const totalCost = parseFloat(source_amount) + feeAmount;

        // Simple scoring: balance cost and speed
        const costScore = (1 - method.fee_percentage) * 50; // Lower fees = higher score
        const speedScore = (48 - method.avg_settlement_hours) / 48 * 50; // Faster = higher score
        const score = costScore + speedScore;

        return {
            payment_method_id: method.id,
            method_name: method.name,
            method_type: method.type,
            estimated_cost: feeAmount.toFixed(8),
            total_cost: totalCost.toFixed(8),
            estimated_time_hours: method.avg_settlement_hours,
            exchange_rate: exchangeRate,
            target_amount: targetAmount,
            score: score.toFixed(2)
        };
    });

    // Sort by score (best routes first)
    routes.sort((a, b) => b.score - a.score);

    // Create quote record for tracking
    const quoteId = require('crypto').randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    console.log(`✅ Generated ${routes.length} routes for quote ${quoteId}`);

    console.log(targetAmount);

    // Save quote to database
    await sequelize.query(`
    INSERT INTO quotes (id, source_currency, target_currency, source_amount, exchange_rate, expires_at, status, target_amount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, {
    replacements: [quoteId, source_currency, target_currency, source_amount, exchangeRate, expiresAt, 'active', targetAmount]
    });

    // Save all routes to database
    for (const route of routes) {
        await sequelize.query(`
      INSERT INTO quote_routes (id, quote_id, payment_method_id, estimated_cost, estimated_time_hours, score)
      VALUES (?, ?, ?, ?, ?, ?)
    `, {
            replacements: [
                require('crypto').randomUUID(),
                quoteId,
                route.payment_method_id,
                route.estimated_cost,
                route.estimated_time_hours,
                route.score
            ]
        });
    }

    console.log(`✅ Saved quote ${quoteId} with ${routes.length} routes to database`);


    return {
        quote_id: quoteId,
        source_currency,
        target_currency,
        source_amount: source_amount.toString(),
        exchange_rate: exchangeRate.toString(),
        routes,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
    };
};

// Mock exchange rate function (we'll make this real later)
const getMockExchangeRate = async (from, to) => {
    // Mock rates - in real systems this hits multiple FX providers
    const rates = {
        'USD-EUR': 0.85,
        'EUR-USD': 1.18,
        'USD-GBP': 0.73,
        'GBP-USD': 1.37,
        'EUR-GBP': 0.86,
        'GBP-EUR': 1.16,
        'USD-USDC': 1.0,
        'USDC-USD': 1.0
    };

    const rateKey = `${from}-${to}`;
    const rate = rates[rateKey] || 1.0;

    console.log(`💱 Exchange rate ${from}→${to}: ${rate}`);
    return rate;
};

module.exports = {
    generateQuote
};