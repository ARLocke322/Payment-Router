const BasePaymentRail = require('./BasePaymentRail');

class SepaPaymentRail extends BasePaymentRail {
    constructor(name, type, supportedCurrencies, operatingHours) {
        super("SepaPaymentRail", ["EUR"], "business")
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
        const isInstant = this.isInstantPayment(paymentDetails.paymentMethodName);

        // Different success rates
        const successRate = isInstant ? 0.95 : 0.995;
        const isSuccess = Math.random() < successRate;

        if (isSuccess) {
            return {
                status: 'processing',
                reference: `${isInstant ? 'SEPA_INST' : 'SEPA'}_${Date.now()}`,
                message: `${isInstant ? 'Instant' : 'Regular'} SEPA transfer initiated`,
                estimatedCompletion: new Date(Date.now() + (this.estimateSettlement(paymentDetails) * 60 * 60 * 1000)).toISOString()
            };
        } else {
            return {
                status: 'failed',
                reference: null,
                message: `${isInstant ? 'SEPA Instant' : 'SEPA'} network temporarily unavailable`
            };
        }
    }

    /**
     * Validate if payment can be processed by this rail
     * @param {Object} paymentDetails 
     * @returns {Object} {isValid: boolean, errors: string[]}
     */
    validate(paymentDetails) {
        // Shared validation logic
        const basicValidation = this.validateBasics(paymentDetails);
        if (!basicValidation.isValid) return basicValidation;

        const errors = [];
        const isInstant = this.isInstantPayment(paymentDetails.paymentMethodName);

        // Different amount limits
        const maxAmount = isInstant ? 100000 : 999999;
        if (paymentDetails.sourceAmount > maxAmount) {
            errors.push(`${isInstant ? 'SEPA Instant' : 'SEPA'} maximum is €${maxAmount}`);
        }

        return { isValid: errors.length === 0, errors };
    }

    /**
     * Estimate settlement time in hours
     * @param {Object} paymentDetails
     * @returns {number} Hours until settlement
     */
    estimateSettlement(paymentDetails) {
        const isInstant = this.isInstantPayment(paymentDetails.paymentMethodName);

        if (isInstant) {
            return 0; // SEPA Instant: 10 seconds ≈ 0 hours
        }

        // Regular SEPA logic
        let hours = 4; // Base time

        if (!this.isOperating()) {
            hours += this.getHoursUntilOperating();
        }

        return hours;
    }

    /**
     * Calculate fees for this payment
     * @param {number} amount
     * @returns {number} Fee amount in source currency
     */
    calculateFees(paymentDetails) {
        const isInstant = this.isInstantPayment(paymentDetails.paymentMethodName);

        let fee = isInstant ? 1.50 : 0.50; // Different base fees

        // Shared fee logic
        if (paymentDetails.sourceAmount > 50000) {
            fee += 2.00; // Large amount handling
        }

        return fee;
    }

    isInstantPayment(paymentMethodName) {
        const instantMethods = [
            'SEPA Instant',
            'Faster Payments (UK)',
            'FedWire (Domestic)'
        ];
        return instantMethods.includes(paymentMethodName);
    }
}


module.exports = SepaPaymentRail;