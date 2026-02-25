/**
 * Centralized error handler.
 * Must be the LAST middleware registered in app.js.
 */
const errorHandler = (err, req, res, next) => {
    console.error(`[ERROR] ${err.stack || err.message}`);

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map((e) => ({
            field: e.path,
            message: e.message,
        }));
        return res.status(422).json({ success: false, message: 'Validation error.', errors });
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0];
        return res.status(409).json({
            success: false,
            message: `A record with this ${field || 'value'} already exists.`,
        });
    }

    // JWT errors (should be caught in auth middleware, but just in case)
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }

    // Default 500
    const status = err.status || err.statusCode || 500;
    const message =
        process.env.NODE_ENV === 'production' && status === 500
            ? 'An internal server error occurred.'
            : err.message || 'An internal server error occurred.';

    res.status(status).json({ success: false, message });
};

module.exports = { errorHandler };
