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
const donationRouter = require('./routes/donation');
const contactRouter = require('./routes/contact');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// ─── Trust Proxy (Required for Fly.io/Render rate limiting) ─────────────
app.set('trust proxy', 1);

// ─── Security headers ─────────────────────────────────────────────────────────
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "blob:", "http://localhost:5000", BACKEND_URL],
            connectSrc: ["'self'", "http://localhost:5000", BACKEND_URL],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://kmsf-uk.netlify.app',
    ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()) : []),
];

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (e.g. mobile apps, curl, Postman)
            if (!origin) return callback(null, true);
            if (allowedOrigins.includes(origin)) return callback(null, true);
            callback(new Error(`CORS: Origin '${origin}' not allowed`));
        },
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
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
app.use(limiter); // Apply globally to ALL routes

// ─── Stricter rate limit for auth endpoints ────────────────────────────────────
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50, // 50 auth attempts per 15 mins per IP
    standardHeaders: true,
    legacyHeaders: false,
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
    });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/login', authLimiter);           // Auth limiter only on login
app.use('/register', authLimiter);        // Auth limiter only on register
app.use('/', authRouter);                 // /login, /request-verification, etc.
app.use('/', subscriptionRouter);         // /start-subscription, /renew-subscription
app.use('/', memberRouter);               // /member/subscription-status
app.use('/admin', adminRouter);           // /admin/*
app.use('/events', eventRouter);          // /events/*
app.use('/donations', donationRouter);    // /donations/*
// Strict rate limit for contact form — prevents email flooding
const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Only 5 contact form submissions per hour per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many messages sent. Please try again later.' },
});
app.use('/contact', contactLimiter, contactRouter);  // /contact/*

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found.' });
});

// ─── Centralized Error Handler (must be last) ─────────────────────────────────
app.use(errorHandler);

module.exports = app;
