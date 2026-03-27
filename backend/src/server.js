import http from 'http';
import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

async function startServer() {
    // Attempt database connection
    const dbConnected = await connectDB();

    server.listen(PORT, () => {
        console.log(`
╔═══════════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                               ║
║   🛒  Vulnerable E-Commerce Platform                                                          ║
║   ⚠️   FOR AUTHORIZED SECURITY TESTING ONLY                                                   ║
║                                                                                               ║
║   Server running on: http://localhost:${PORT}                                                 ║
║   Environment:       ${(process.env.NODE_ENV || 'development').padEnd(23)}                    ║
║   Database:          ${dbConnected ? '✅ Connected'.padEnd(23) : '❌ Disconnected'.padEnd(23)}║
║   Health check:      http://localhost:${PORT}/api/health                                      ║
║                                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════════════════════╝
    `);
    });
}

const shutdown = async (signal) => {
    console.log(`${signal} received. Shutting down gracefully...`);
    await disconnectDB();
    server.close(() => {
        console.log('Server closed.');
        process.exit(0);
    });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));


// VULNERABLE: Unhandled rejection & uncaught exception handlers that leak info
// Maps to: OWASP A05:2021 – Security Misconfiguration
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Do not crash – keeps server running with potential inconsistent state
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // VULNERABLE: Not exiting on uncaught exception – can leave app in bad state
    // In production this should exit, but we keep running intentionally
});

// Start it up
startServer();
