const SwiftPaymentRail = require('./SwiftPaymentRail');
const SepaPaymentRail = require('./SepaPaymentRail');
const CryptoPaymentRail = require('./CryptoPaymentRail');

class RailFactory {
  static createRail(paymentMethodName) {
    const railMapping = {
      // Traditional Banking → SwiftPaymentRail (USD, EUR, GBP, JPY, CHF, CAD, AUD)
      'SWIFT Wire Transfer': SwiftPaymentRail,
      'Correspondent Banking': SwiftPaymentRail,
      'International ACH': SwiftPaymentRail,
      'Same-Day Wire': SwiftPaymentRail,
      'Overnight Express': SwiftPaymentRail,
      
      // European Regional → SepaPaymentRail (EUR only)
      'SEPA Credit Transfer': SepaPaymentRail,
      'SEPA Instant': SepaPaymentRail,
      
      // Cryptocurrency → CryptoPaymentRail (BTC, ETH only)
      'Bitcoin Network': CryptoPaymentRail,
      'Ethereum Network': CryptoPaymentRail,
      'Lightning Network': CryptoPaymentRail
    };

    const RailClass = railMapping[paymentMethodName];
    
    if (!RailClass) {
      throw new Error(`No rail found for payment method: ${paymentMethodName}`);
    }

    return new RailClass();
  }
}

module.exports = RailFactory;