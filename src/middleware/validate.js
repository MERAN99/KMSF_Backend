const { body, validationResult } = require('express-validator');

/**
 * Runs validation result and returns 422 if there are errors.
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({
            success: false,
            message: 'Validation failed.',
            errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
        });
    }
    next();
};

// ─── Validation Chains ────────────────────────────────────────────────────────

const validateStartSubscription = [
    body('title').notEmpty().withMessage('Title is required.').trim(),
    body('firstName').notEmpty().withMessage('First name is required.').trim(),
    body('lastName').notEmpty().withMessage('Last name is required.').trim(),
    body('gender').notEmpty().withMessage('Gender is required.').trim(),
    body('organization').notEmpty().withMessage('Organization is required.').trim(),
    body('email').isEmail().withMessage('Valid email is required.').trim().toLowerCase(),
    body('speciality').notEmpty().withMessage('Speciality is required.').trim(),
    body('telephone').notEmpty().withMessage('Telephone is required.').trim(),
    body('addressLine1').notEmpty().withMessage('Address Line 1 is required.').trim(),
    body('addressLine2').optional().trim(),
    body('city').notEmpty().withMessage('City is required.').trim(),
    body('country').notEmpty().withMessage('Country is required.').trim(),
    body('postCode').notEmpty().withMessage('Post code is required.').trim(),
    body('password').custom((value) => {
        if (!value) {
            throw new Error('Password is required.');
        }
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(value)) {
            throw new Error('Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.');
        }
        return true;
    }),
    handleValidationErrors,
];

const validateLogin = [
    body('email').isEmail().withMessage('Valid email is required.').trim().toLowerCase(),
    body('password').notEmpty().withMessage('Password is required.'),
    handleValidationErrors,
];

const validateRegister = [
    body('title').notEmpty().withMessage('Title is required.').trim(),
    body('firstName').notEmpty().withMessage('First name is required.').trim(),
    body('lastName').notEmpty().withMessage('Last name is required.').trim(),
    body('gender').notEmpty().withMessage('Gender is required.').trim(),
    body('email').isEmail().withMessage('Valid email is required.').trim().toLowerCase(),
    body('profession').notEmpty().withMessage('Profession is required.').trim(),
    body('speciality').optional().trim(),
    body('telephone').notEmpty().withMessage('Telephone is required.').trim(),
    body('addressLine1').notEmpty().withMessage('Address Line 1 is required.').trim(),
    body('addressLine2').optional().trim(),
    body('city').notEmpty().withMessage('City is required.').trim(),
    body('country').notEmpty().withMessage('Country is required.').trim(),
    body('postCode').notEmpty().withMessage('Post code is required.').trim(),
    body('password').custom((value) => {
        if (!value) throw new Error('Password is required.');
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(value)) {
            throw new Error('Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.');
        }
        return true;
    }),
    handleValidationErrors,
];


const validateAnnouncement = [
    body('title').notEmpty().withMessage('Announcement title is required.').trim(),
    body('message').notEmpty().withMessage('Announcement message is required.').trim(),
    body('filter')
        .optional()
        .isIn(['active', 'all'])
        .withMessage('Filter must be "active" or "all".'),
    handleValidationErrors,
];

const validateRequestVerification = [
    body('email').isEmail().withMessage('Valid email is required.').trim().toLowerCase(),
    handleValidationErrors,
];

const validateConfirmVerification = [
    body('email').isEmail().withMessage('Valid email is required.').trim().toLowerCase(),
    body('code').isLength({ min: 6, max: 6 }).withMessage('6-digit code is required.'),
    handleValidationErrors,
];

const validateCreateMember = [
    body('title').notEmpty().withMessage('Title is required.').trim(),
    body('firstName').notEmpty().withMessage('First name is required.').trim(),
    body('lastName').notEmpty().withMessage('Last name is required.').trim(),
    body('gender').notEmpty().withMessage('Gender is required.').trim(),
    body('organization').notEmpty().withMessage('Organization is required.').trim(),
    body('email').isEmail().withMessage('Valid email is required.').trim().toLowerCase(),
    body('speciality').notEmpty().withMessage('Speciality is required.').trim(),
    body('addressLine1').notEmpty().withMessage('Address Line 1 is required.').trim(),
    body('addressLine2').optional().trim(),
    body('city').notEmpty().withMessage('City is required.').trim(),
    body('country').notEmpty().withMessage('Country is required.').trim(),
    body('postCode').notEmpty().withMessage('Post code is required.').trim(),
    body('password').optional().custom((value) => {
        if (!value) return true;
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(value)) {
            throw new Error('Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.');
        }
        return true;
    }),
    handleValidationErrors,
];

const validateUpdateMember = [
    body('title').optional().notEmpty().withMessage('Title cannot be empty.').trim(),
    body('firstName').optional().notEmpty().withMessage('First name cannot be empty.').trim(),
    body('lastName').optional().notEmpty().withMessage('Last name cannot be empty.').trim(),
    body('gender').optional().isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender.'),
    body('organization').optional().isIn(['KSA', 'KuMA']).withMessage('Invalid organization.'),
    body('speciality').optional().notEmpty().withMessage('Speciality cannot be empty.').trim(),
    body('addressLine1').optional().notEmpty().withMessage('Address Line 1 cannot be empty.').trim(),
    body('addressLine2').optional().trim(),
    body('city').optional().notEmpty().withMessage('City cannot be empty.').trim(),
    body('country').optional().notEmpty().withMessage('Country cannot be empty.').trim(),
    body('postCode').optional().notEmpty().withMessage('Post code cannot be empty.').trim(),
    handleValidationErrors,
];

const validateForgotPassword = [
    body('email').isEmail().withMessage('Valid email is required.').trim().toLowerCase(),
    handleValidationErrors,
];

const validateVerifyResetCode = [
    body('email').isEmail().withMessage('Valid email is required.').trim().toLowerCase(),
    body('code').isString().isLength({ min: 6, max: 6 }).withMessage('6-digit code is required.'),
    handleValidationErrors,
];

const validateResetPassword = [
    body('email').isEmail().withMessage('Valid email is required.').normalizeEmail(),
    body('code').notEmpty().withMessage('Verification code is required.'),
    body('newPassword').custom((value) => {
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(value)) {
            throw new Error('Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.');
        }
        return true;
    }),
    handleValidationErrors,
];

const validateEvent = [
    body('title').notEmpty().withMessage('Title is required.').trim(),
    body('description').notEmpty().withMessage('Description is required.').trim(),
    body('date').isISO8601().withMessage('Valid date is required.'),
    body('location').notEmpty().withMessage('Location is required.').trim(),
    body('organizer').notEmpty().withMessage('Organizer is required.').trim(),
    handleValidationErrors,
];

module.exports = {
    validateStartSubscription,
    validateLogin,
    validateRegister,
    validateAnnouncement,
    validateRequestVerification,
    validateConfirmVerification,
    validateCreateMember,
    validateUpdateMember,
    validateForgotPassword,
    validateVerifyResetCode,
    validateResetPassword,
    validateEvent,
    handleValidationErrors,
};
