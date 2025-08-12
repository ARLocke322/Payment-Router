const BasePaymentRail = require('./BasePaymentRail');

class SwiftPaymentRail extends BasePaymentRail {
    constructor(name, type, supportedCurrencies, operatingHours) {
        super("SwiftPaymentRail", ["USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD"], "business")
    }

    // Abstract methods - must be implemented by subclasses

    /**
     * Execute payment through this rail
     * @param {Object} paymentDetails - Payment information
     * @param {string} paymentDetails.sourceCurrency 
     * @param {string} paymentDetails.targetCurrency
     * @param {number} paymentDetails.sourceAmount
     * @param {string} paymentDetails.paymentMethodId
     * @returns {Promise<Object>} Payment result with status, reference, message
     */
    async execute(paymentDetails) {
        const usdAmount = this.getUSDValue(paymentDetails);

        // Adjust success rate based on amount size
        let successRate = 0.98; // Base 98% success rate

        if (usdAmount > 50000) {
            successRate = 0.95; // 95% for large amounts (compliance delays)
        }

        if (usdAmount > 500000) {
            successRate = 0.92; // 92% for very large amounts (extensive screening)
        }

        const isSuccess = Math.random() < successRate;

        if (isSuccess) {
            return {
                status: 'processing',
                reference: `SWIFT_${Date.now()}`,
                message: 'SWIFT wire transfer initiated successfully',
                estimatedCompletion: new Date(Date.now() + (this.estimateSettlement(paymentDetails) * 60 * 60 * 1000)).toISOString()
            };
        } else {
            // Simple failure reasons based on amount
            const failureMessage = usdAmount > 50000
                ? 'Transfer flagged for compliance review'
                : 'Correspondent bank temporarily unavailable';

            return {
                status: 'failed',
                reference: null,
                message: failureMessage
            };
        }
    }

    /**
     * Validate if payment can be processed by this rail
     * @param {Object} paymentDetails 
     * @returns {Object} {isValid: boolean, errors: string[]}
     */
    validate(paymentDetails) {
        const basicValidation = this.validateBasics(paymentDetails);
        if (!basicValidation.isValid) {
            return basicValidation;
        }

        const errors = [];


        const USDValue = this.getUSDValue(paymentDetails);
        if (USDValue < 100) {
            errors.push(`Minimum amount not met`);
        } else if (USDValue > 10000000) {
            errors.push(`Maximum amount exceeded`);
        }

        return { isValid: errors.length === 0, errors };


    }

    /**
     * Estimate settlement time in hours
     * @param {Object} paymentDetails
     * @returns {number} Hours until settlement
     */
    estimateSettlement(paymentDetails) {
        const usdAmount = this.getUSDValue(paymentDetails);
        let processingHours = 24; // Base SWIFT processing time

        // Large amount compliance delay
        if (usdAmount > 10000) {
            processingHours += 24; // Extra day 
        }

        // Add delay if not currently operating
        const operatingDelay = this.getHoursUntilOperating();

        return processingHours + operatingDelay;
    }

    /**
     * Calculate fees for this payment
     * @param {number} amount
     * @returns {number} Fee amount in source currency
     */
    calculateFees(paymentDetails) {
        const USDAmount = this.getUSDValue(paymentDetails)
        let fees = 15;

        // Large amount surcharge
        if (usdAmount > 50000) {
            fees += 25;
        }

        // Cross-border fee
        if (paymentDetails.sourceCurrency !== paymentDetails.targetCurrency) {
            fees += 10;
        }

        // Correspondant fee (random)
        fees += Math.floor(Math.random() * 15) + 5; // $5-20

        return fees; // Always return fees in USD for SWIFT
    }

    getUSDValue(paymentDetails) {
        const { sourceCurrency, sourceAmount, targetCurrency, exchangeRate } = paymentDetails;

        // If already USD, return as-is
        if (sourceCurrency === 'USD') {
            return sourceAmount;
        }

        // If target is USD, use the exchange rate directly
        if (targetCurrency === 'USD') {
            return sourceAmount * exchangeRate;
        }

        // For other currencies, we need USD rates
        // Use approximate USD conversion (simplified for demo)
        const approxUSDRates = {
            'EUR': 1.18,  // 1 EUR = 1.18 USD
            'GBP': 1.37,  // 1 GBP = 1.37 USD
            'JPY': 0.0067, // 1 JPY = 0.0067 USD
            'CHF': 1.14,  // 1 CHF = 1.14 USD
            'CAD': 0.74,  // 1 CAD = 0.74 USD
            'AUD': 0.66   // 1 AUD = 0.66 USD
        };

        const usdRate = approxUSDRates[sourceCurrency] || 1.0;
        return sourceAmount * usdRate;
    }
}

module.exports = SwiftPaymentRail;