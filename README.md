# Multi-Currency Payment Router

A fintech payment processing API that finds optimal routes for international money transfers.

## Features
- Multi-currency support (USD, EUR, GBP, BTC, USDC)
- Route optimization (cost vs speed)
- Quote generation with 15-minute expiration
- Payment execution with provider simulation
- Complete audit trail for compliance

## API Endpoints
- `POST /api/quotes` - Get payment route options
- `POST /api/execute` - Execute a payment
- `GET /health` - Health check

## Quick Start
```bash
npm install
npm run dev

## Example Usage
# Get quote
curl -X POST http://localhost:3000/api/quotes \
  -H "Content-Type: application/json" \
  -d '{"source_currency":"USD","target_currency":"EUR","source_amount":1000}'

# Execute payment
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"quote_id":"...","payment_method_id":"..."}'
# Payment-Router
