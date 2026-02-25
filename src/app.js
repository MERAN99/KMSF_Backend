require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const webhookRouter = require('./routes/webhook');
const authRouter = require('./routes/auth');
const subscriptionRouter = require('./routes/subscription');
const memberRouter = require('./routes/member');
const adminRouter = require('./routes/admin');
const eventRouter = require('./routes/event');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// ─── Security headers ─────────────────────────────────────────────────────────
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"], // Add your specific script origins here
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "blob:", "http://localhost:5000"], // Adjust for production
            connectSrc: ["'self'", "http://localhost:5000"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// ─── CORS ────────────────────────────────────────────────────────────────────
app.use(
    cors({
        origin: process.env.NODE_ENV === 'production'
            ? process.env.CORS_ORIGIN
            : '*',
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    })
);

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests from this IP. Please try again later.' },
});
app.use('/api/', limiter); // Apply to all /api routes if applicable

// ─── Stricter rate limit for auth endpoints ────────────────────────────────────
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20, // Increased from 10 to 20 attempts per 15 mins
    message: { success: false, message: 'Too many attempts. Please try again later.' },
});

// ─── Webhook route MUST come before express.json() ───────────────────────────
// The webhook route applies express.raw() internally
app.use('/', webhookRouter);

// ─── Body Parsing (after webhook) ────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
    });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/', authLimiter);           // Apply auth limiter to all routes (tweak as needed)
app.use('/', authRouter);            // /login, /request-verification, etc.
app.use('/', subscriptionRouter);    // /start-subscription, /renew-subscription
app.use('/', memberRouter);          // /member/subscription-status
app.use('/admin', adminRouter);      // /admin/*
app.use('/events', eventRouter);     // /events/*

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found.' });
});

// ─── Centralized Error Handler (must be last) ─────────────────────────────────
app.use(errorHandler);

module.exports = app;
