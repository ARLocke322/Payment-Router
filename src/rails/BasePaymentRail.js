class BasePaymentRail {
    constructor(name, supportedCurrencies, operatingHours) {
        this.name = name;
        this.supportedCurrencies = supportedCurrencies;
        this.operatingHours = operatingHours; // '24/7', 'business', or custom
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
        throw new Error(`Execute method not implemented for ${this.name}`);
    }

    /**
     * Validate if payment can be processed by this rail
     * @param {Object} paymentDetails 
     * @returns {Object} {isValid: boolean, errors: string[]}
     */
    validate(paymentDetails) {
        throw new Error(`Validate method not implemented for ${this.name}`);
    }

    /**
     * Estimate settlement time in hours
     * @param {Object} paymentDetails
     * @returns {number} Hours until settlement
     */
    estimateSettlement(paymentDetails) {
        throw new Error(`EstimateSettlement method not implemented for ${this.name}`);
    }

    /**
     * Calculate fees for this payment
     * @param {number} paymentDetails
     * @returns {number} Fee amount in source currency
     */
    calculateFees(paymentDetails) {
        throw new Error(`CalculateFees method not implemented for ${this.name}`);
    }

    // Common helper methods
    validateBasics(paymentDetails) {
        const errors = [];

        if (!paymentDetails.sourceCurrency) errors.push('Source currency is required');
        if (!paymentDetails.targetCurrency) errors.push('Target currency is required');
        if (!paymentDetails.sourceAmount || paymentDetails.sourceAmount <= 0) {
            errors.push('Source amount must be greater than 0');
        }

        if (!this.supportedCurrencies.includes(paymentDetails.sourceCurrency)) {
            errors.push(`Source currency ${paymentDetails.sourceCurrency} not supported by ${this.name}`);
        }

        if (!this.supportedCurrencies.includes(paymentDetails.targetCurrency)) {
            errors.push(`Target currency ${paymentDetails.targetCurrency} not supported by ${this.name}`);
        }

        return { isValid: errors.length === 0, errors };
    }

    isOperating() {
        if (this.operatingHours === '24/7') {
            return true;
        }

        const now = new Date();
        const day = now.getDay(); // 0 = Sunday, 6 = Saturday
        const hour = now.getHours();

        if (this.operatingHours === 'business') {
            // Monday-Friday, 9 AM - 5 PM
            return day >= 1 && day <= 5 && hour >= 9 && hour < 17;
        }

        return true;
    }

    /**
     * Calculate hours until next operating time
     */
    getHoursUntilOperating() {
        if (this.isOperating()) {
            return 0;
        }

        const now = new Date();
        const nextOperatingTime = this.getNextOperatingTime();

        if (!nextOperatingTime) {
            return 0; // Always operating
        }

        return Math.ceil((nextOperatingTime - now) / (1000 * 60 * 60));
    }
}

module.exports = BasePaymentRail;