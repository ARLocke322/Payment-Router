require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'ALocke-DEV-188',
    database: process.env.DB_NAME || 'payment_router_dev',
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgresql',
    logging: console.log, // Shows SQL queries - great for learning!
    
    // Production-ready settings you'll appreciate later
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
};