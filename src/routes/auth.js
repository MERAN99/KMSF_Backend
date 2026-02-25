const express = require('express');
const router = express.Router();
const { login, requestVerification, confirmVerification, changePassword, forgotPassword, verifyResetCode, resetPassword } = require('../controllers/authController');
const {
    validateLogin,
    validateRequestVerification,
    validateConfirmVerification,
    validateForgotPassword,
    validateVerifyResetCode,
    validateResetPassword
} = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');

// POST /login
router.post('/login', validateLogin, login);

// POST /request-verification
router.post('/request-verification', validateRequestVerification, requestVerification);

// POST /confirm-verification
router.post('/confirm-verification', validateConfirmVerification, confirmVerification);

// PATCH /change-password
router.patch('/change-password', requireAuth, changePassword);

// POST /forgot-password
router.post('/forgot-password', validateForgotPassword, forgotPassword);

// POST /verify-reset-code
router.post('/verify-reset-code', validateVerifyResetCode, verifyResetCode);

// POST /reset-password
router.post('/reset-password', validateResetPassword, resetPassword);

module.exports = router;
