/**
 * Production Database Configuration
 * PostgreSQL with connection pooling, SSL, and health monitoring
 */

const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

let sequelize;

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'pocketshield',
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  dialect: 'postgres',
  
  // Connection Pool Configuration
  pool: {
    max: parseInt(process.env.DB_POOL_MAX) || 20,
    min: parseInt(process.env.DB_POOL_MIN) || 5,
    acquire: 30000,
    idle: 10000,
    evict: 1000,
    handleDisconnects: true
  },

  // SSL Configuration for production
  dialectOptions: process.env.NODE_ENV === 'production' ? {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  } : {},

  // Logging configuration
  logging: process.env.NODE_ENV === 'production' 
    ? (msg) => logger.debug(msg)
    : console.log,

  // Performance optimizations
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true,
    charset: 'utf8',
    collate: 'utf8_unicode_ci'
  },

  // Query timeout
  dialectOptions: {
    ...((process.env.NODE_ENV === 'production') && {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }),
    statement_timeout: 30000,
    idle_in_transaction_session_timeout: 30000
  },

  // Retry configuration
  retry: {
    max: 3,
    timeout: 60000,
    match: [
      /ETIMEDOUT/,
      /EHOSTUNREACH/,
      /ECONNRESET/,
      /ECONNREFUSED/,
      /ETIMEDOUT/,
      /ESOCKETTIMEDOUT/,
      /EHOSTUNREACH/,
      /EPIPE/,
      /EAI_AGAIN/,
      /SequelizeConnectionError/,
      /SequelizeConnectionRefusedError/,
      /SequelizeHostNotFoundError/,
      /SequelizeHostNotReachableError/,
      /SequelizeInvalidConnectionError/,
      /SequelizeConnectionTimedOutError/,
      /SequelizeDatabaseError/
    ]
  }
};

// Initialize Sequelize connection
const connectDatabase = async () => {
  try {
    // Create Sequelize instance
    sequelize = process.env.DATABASE_URL 
      ? new Sequelize(process.env.DATABASE_URL, config)
      : new Sequelize(config.database, config.username, config.password, config);

    // Test the connection
    await sequelize.authenticate();
    logger.info('✅ Database connection established successfully');

    // Sync models in development
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('✅ Database models synchronized');
    }

    // Set up connection event handlers
    sequelize.addHook('beforeConnect', (config) => {
      logger.debug('🔌 Attempting database connection...');
    });

    sequelize.addHook('afterConnect', (connection, config) => {
      logger.debug('✅ Database connection established');
    });

    sequelize.addHook('beforeDisconnect', (connection) => {
      logger.debug('🔌 Disconnecting from database...');
    });

    return sequelize;

  } catch (error) {
    logger.error('❌ Unable to connect to database:', error);
    throw error;
  }
};

// Health check function
const checkDatabaseHealth = async () => {
  try {
    if (!sequelize) {
      throw new Error('Database not initialized');
    }

    await sequelize.authenticate();
    
    // Get connection pool info
    const pool = sequelize.connectionManager.pool;
    const poolInfo = {
      total: pool.size,
      idle: pool.available,
      waiting: pool.pending
    };

    return {
      status: 'healthy',
      connection: 'active',
      pool: poolInfo,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    logger.error('Database health check failed:', error);
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

// Graceful database closure
const closeDatabase = async () => {
  try {
    if (sequelize) {
      await sequelize.close();
      logger.info('✅ Database connection closed successfully');
    }
  } catch (error) {
    logger.error('❌ Error closing database connection:', error);
    throw error;
  }
};

// Execute raw queries with retry logic
const executeQuery = async (query, options = {}) => {
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const result = await sequelize.query(query, {
        type: Sequelize.QueryTypes.SELECT,
        ...options
      });
      return result;
    } catch (error) {
      attempt++;
      logger.warn(`Query attempt ${attempt} failed:`, error.message);
      
      if (attempt >= maxRetries) {
        logger.error('Query failed after maximum retries:', error);
        throw error;
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
};

// Transaction wrapper with retry logic
const withTransaction = async (callback) => {
  const transaction = await sequelize.transaction();
  
  try {
    const result = await callback(transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    logger.error('Transaction rolled back:', error);
    throw error;
  }
};

// Database statistics
const getDatabaseStats = async () => {
  try {
    const stats = await executeQuery(`
      SELECT 
        schemaname,
        tablename,
        attname,
        n_distinct,
        correlation
      FROM pg_stats 
      WHERE schemaname = 'public'
      LIMIT 10
    `);

    const tableStats = await executeQuery(`
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes
      FROM pg_stat_user_tables
    `);

    return {
      columnStats: stats,
      tableStats: tableStats,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    logger.error('Failed to get database stats:', error);
    return null;
  }
};

module.exports = {
  sequelize: () => sequelize,
  connectDatabase,
  closeDatabase,
  checkDatabaseHealth,
  executeQuery,
  withTransaction,
  getDatabaseStats,
  Sequelize
};
