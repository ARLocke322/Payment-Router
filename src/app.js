const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { connectDB } = require('./services/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbConnected = await connectDB();
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: dbConnected ? 'connected' : 'disconnected',
    version: '1.0.0'
  });
});

// Basic test endpoint to verify database works
app.get('/api/currencies', async (req, res) => {
  try {
    const { Currency } = require('./services/database');
    const currencies = await Currency.findAll({
      where: { is_active: true }
    });
    
    res.json({
      success: true,
      data: currencies,
      count: currencies.length
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch currencies'
    });
  }
});

app.listen(PORT, async () => {
  console.log(`🚀 Payment Router API running on port ${PORT}`);
  
  // Test database connection on startup
  await connectDB();
});

module.exports = app;

const quotesRouter = require('./routes/quotes');
app.use('/api/quotes', quotesRouter);

const executeRouter = require('./routes/execute');
app.use('/api/execute', executeRouter);