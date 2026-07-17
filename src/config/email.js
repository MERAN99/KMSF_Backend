const nodemailer = require('nodemailer');

// ─── Primary transporter (Gmail) — used for welcome, announcements, contact, etc.
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// ─── Brevo transporter — used exclusively for OTP / verification emails
const brevoTransporter = nodemailer.createTransport({
    host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
    port: parseInt(process.env.BREVO_SMTP_PORT, 10) || 587,
    secure: false,
    auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_PASS,
    },
});

// Verify connections on startup (non-blocking)
transporter.verify((error) => {
    if (error) {
        console.warn(`Email transporter warning: ${error.message}`);
    } else {
        console.log('Email transporter ready (Gmail)');
    }
});

brevoTransporter.verify((error) => {
    if (error) {
        console.warn(`Brevo transporter warning: ${error.message}`);
    } else {
        console.log('Brevo transporter ready (OTP)');
    }
});

module.exports = { transporter, brevoTransporter };
