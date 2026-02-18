const { PrismaClient } = require('./generated/prisma');

// Singleton Prisma client instance
// Prevents multiple connections during hot-reloading in development
let prisma;

if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient({
        log: ['error'],
    });
} else {
    // In development, reuse the client across hot-reloads
    if (!global.__prisma) {
        global.__prisma = new PrismaClient({
            // VULNERABLE: Verbose logging in development exposes query details
            // Maps to: OWASP A05:2021 – Security Misconfiguration
            // PortSwigger – Information Disclosure
            log: ['query', 'info', 'warn', 'error'],
        });
    }
    prisma = global.__prisma;
}

/**
 * Connect to the database and log status.
 * Called during server startup.
 */
async function connectDB() {
    try {
        await prisma.$connect();
        console.log('✅ Database connected successfully');
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        // VULNERABLE: Not exiting on DB failure – app runs without database
        // which can lead to inconsistent state or bypass of DB-based auth
        return false;
    }
}

/**
 * Gracefully disconnect from the database.
 */
async function disconnectDB() {
    await prisma.$disconnect();
    console.log('📦 Database disconnected');
}

module.exports = { prisma, connectDB, disconnectDB };
