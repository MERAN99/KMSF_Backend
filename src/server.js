require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    await connectDB();

    const server = app.listen(PORT, () => {
        console.log(`
╔══════════════════════════════════════════════╗
║        KMSF Backend Server Running           ║
╠══════════════════════════════════════════════╣
║  Port    : ${PORT}                              ║
║  Env     : ${(process.env.NODE_ENV || 'development').padEnd(10)}                    ║
║  Time    : ${new Date().toISOString()}    ║
╚══════════════════════════════════════════════╝
    `);
    });

    // Graceful shutdown handlers
    const shutdown = (signal) => {
        console.log(`\n${signal} received. Shutting down gracefully...`);
        server.close(() => {
            console.log('HTTP server closed.');
            process.exit(0);
        });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        server.close(() => process.exit(1));
    });
};

startServer();
