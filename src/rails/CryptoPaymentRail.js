const BasePaymentRail = require('./BasePaymentRail');

class CryptoPaymentRail extends BasePaymentRail {
    constructor(name, type, supportedCurrencies, operatingHours) {
        super("CryptoPaymentRail", ["BTC", "ETH"], "24/7")
    }

    // Helper: Determine which network from payment method name
    getNetwork(paymentMethodName) {
        if (paymentMethodName === 'Bitcoin Network') return 'bitcoin';
        if (paymentMethodName === 'Ethereum Network') return 'ethereum';
        if (paymentMethodName === 'Lightning Network') return 'lightning';
        throw new Error(`Unknown crypto method: ${paymentMethodName}`);
    }

    getNetworkCongestion() {
        const congestionLevel = Math.random();
        if (congestionLevel > 0.8) return 'high';
        if (congestionLevel > 0.4) return 'medium';
        return 'low';
    }

    getNetworkConfig(network) {
        const configs = {
            bitcoin: {
                baseFee: 15,
                baseTime: 2,
                successRate: 0.92,
                minAmount: 0.0001,
                maxAmount: 100
            },
            ethereum: {
                baseFee: 8,
                baseTime: 0.5,
                successRate: 0.88,
                minAmount: 0.01,
                maxAmount: 1000
            },
            lightning: {
                baseFee: 0.05,
                baseTime: 0,
                successRate: 0.96,
                minAmount: 0.00000001,
                maxAmount: 0.01
            }
        };
        return configs[network];
    }


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
        const network = this.getNetwork(paymentDetails.paymentMethodName);
        const config = this.getNetworkConfig(network);
        const congestion = this.getNetworkCongestion();

        // Adjust success rate based on congestion
        let successRate = config.successRate;

        if (congestion === 'high') {
            successRate -= 0.05; // 5% penalty for high congestion
        } else if (congestion === 'low') {
            successRate += 0.02; // 2% bonus for low congestion
        }

        const isSuccess = Math.random() < successRate;

        if (isSuccess) {
            const networkPrefix = {
                'bitcoin': 'BTC',
                'ethereum': 'ETH',
                'lightning': 'LN'
            };

            return {
                status: 'processing',
                reference: `${networkPrefix[network]}_${Date.now()}`,
                message: `${paymentDetails.paymentMethodName} transaction initiated successfully`,
                estimatedCompletion: new Date(Date.now() + (this.estimateSettlement(paymentDetails) * 60 * 60 * 1000)).toISOString()
            };
        } else {
            // Simple failure reason based on congestion
            const failureMessage = congestion === 'high'
                ? `${paymentDetails.paymentMethodName} network congested - transaction failed`
                : `${paymentDetails.paymentMethodName} temporarily unavailable`;

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

        const network = this.getNetwork(paymentDetails.paymentMethodName);
        const config = this.getNetworkConfig(network);

        // Network-currency matching
        if (network === 'bitcoin' || network === 'lightning') {
            if (paymentDetails.sourceCurrency !== 'BTC') {
                errors.push(`${paymentDetails.paymentMethodName} requires BTC currency`);
            }
        }

        if (network === 'ethereum') {
            if (paymentDetails.sourceCurrency !== 'ETH') {
                errors.push(`${paymentDetails.paymentMethodName} requires ETH currency`);
            }
        }

        // Amount limits validation
        if (paymentDetails.sourceAmount < config.minAmount) {
            errors.push(`${paymentDetails.paymentMethodName} minimum is ${config.minAmount} ${paymentDetails.sourceCurrency}`);
        }

        if (paymentDetails.sourceAmount > config.maxAmount) {
            errors.push(`${paymentDetails.paymentMethodName} maximum is ${config.maxAmount} ${paymentDetails.sourceCurrency}`);
        }

        // Lightning specific validation
        if (network === 'lightning' && paymentDetails.sourceAmount > 0.001) {
            errors.push('Lightning Network is for micro-payments only (max 0.001 BTC)');
        }



        return { isValid: errors.length === 0, errors };
    }

    /**
     * Estimate settlement time in hours
     * @param {Object} paymentDetails
     * @returns {number} Hours until settlement
     */
    estimateSettlement(paymentDetails) {
        const network = this.getNetwork(paymentDetails.paymentMethodName);
        const config = this.getNetworkConfig(network);
        const congestion = this.getNetworkCongestion();

        let hours = config.baseTime;

        // Congestion impact on timing
        if (congestion === 'high') {
            if (network === 'bitcoin') {
                hours *= 3; // Bitcoin affected
            } else if (network === 'ethereum') {
                hours *= 2; // Ethereum affected
            }
            // Lightning unaffected 
        } else if (congestion === 'medium') {
            if (network === 'bitcoin') {
                hours *= 1.5;
            } else if (network === 'ethereum') {
                hours *= 1.2;
            }
        }

        // Large amount impact (more confirmations needed)
        if (network === 'bitcoin' && paymentDetails.sourceAmount > 10) {
            hours += 2; // Extra confirmations for security
        }

        if (network === 'ethereum' && paymentDetails.sourceAmount > 100) {
            hours += 0.5; // Extra confirmations for large ETH amounts
        }

        return Math.max(0, hours); // Lightning can be 0 hours
    }

    /**
     * Calculate fees for this payment
     * @param {number} amount
     * @returns {number} Fee amount in source currency
     */
    calculateFees(paymentDetails) {
        const network = this.getNetwork(paymentDetails.paymentMethodName);
        const config = this.getNetworkConfig(network);
        const congestion = this.getNetworkCongestion();

        let fee = config.baseFee;

        // Congestion multiplier
        const congestionMultipliers = {
            'low': 0.7,
            'medium': 1.0,
            'high': 2.5
        };
        fee *= congestionMultipliers[congestion];

        // Amount-based scaling for larger transfers 
        if (network === 'bitcoin' && paymentDetails.sourceAmount > 1) {
            fee += paymentDetails.sourceAmount * 5; // $5 per BTC for large amounts
        }

        if (network === 'ethereum' && paymentDetails.sourceAmount > 10) {
            fee += paymentDetails.sourceAmount * 2; // $2 per ETH for large amounts
        }

        // Lightning stays cheap regardless of congestion
        if (network === 'lightning') {
            fee = Math.max(0.01, fee); // Minimum 1 cent
        }

        return parseFloat(fee.toFixed(8));
    }


}


module.exports = CryptoPaymentRail;