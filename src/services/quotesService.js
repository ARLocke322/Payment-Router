const { sequelize } = require('./database');

const generateQuote = async ({ source_currency, target_currency, source_amount }) => {
    console.log(`💱 Generating quote: ${source_amount} ${source_currency} → ${target_currency}`);

    // Validate currencies exist and are active
    const currenciesToCheck = source_currency === target_currency
        ? [source_currency]
        : [source_currency, target_currency];

    const [currencies] = await sequelize.query(`
  SELECT code, decimal_places 
  FROM currencies 
  WHERE code IN (${currenciesToCheck.map(() => '?').join(',')}) AND is_active = true
`, {
        replacements: currenciesToCheck
    });

    if (currencies.length !== currenciesToCheck.length) {
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
  AND ? = ANY(supported_source_currencies)
  AND ? = ANY(supported_target_currencies)
  ORDER BY avg_settlement_hours
`, {
        replacements: [source_amount, source_amount, source_currency, target_currency]
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
    const rates = {
        // USD pairs
        'USD-EUR': 0.85,
        'USD-GBP': 0.73,
        'USD-JPY': 150.25,
        'USD-CHF': 0.88,
        'USD-CAD': 1.35,
        'USD-AUD': 1.52,
        'USD-SGD': 1.34,

        // EUR pairs  
        'EUR-USD': 1.18,
        'EUR-GBP': 0.86,
        'EUR-JPY': 176.47,
        'EUR-CHF': 1.03,
        'EUR-CAD': 1.59,
        'EUR-AUD': 1.79,
        'EUR-SGD': 1.58,

        // GBP pairs
        'GBP-USD': 1.37,
        'GBP-EUR': 1.16,
        'GBP-JPY': 205.84,
        'GBP-CHF': 1.20,
        'GBP-CAD': 1.85,
        'GBP-AUD': 2.08,
        'GBP-SGD': 1.84,

        // Crypto pairs
        'BTC-USD': 42500.00,
        'ETH-USD': 2650.00,
        'BTC-EUR': 50000.00,
        'ETH-EUR': 3117.65,

        // Same currency (should always be 1.0)
        'USD-USD': 1.0,
        'EUR-EUR': 1.0,
        'GBP-GBP': 1.0,
        'BTC-BTC': 1.0,
        'ETH-ETH': 1.0
    };

    const rateKey = `${from}-${to}`;
    const rate = rates[rateKey] || 1.0;

    console.log(`💱 Exchange rate ${from}→${to}: ${rate}`);
    return rate;
};

module.exports = {
    generateQuote
};