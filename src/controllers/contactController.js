const { sendContactEmail } = require('../services/emailService');

const submitContactForm = async (req, res, next) => {
    try {
        const { name, email, subject, message } = req.body;

        if (!name || !email || !subject || !message) {
            return res.status(400).json({ success: false, message: 'All fields are required.' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
        }

        // Limit field lengths to prevent abuse
        if (name.length > 100 || subject.length > 200 || message.length > 5000) {
            return res.status(400).json({ success: false, message: 'Input exceeds allowed length.' });
        }

        await sendContactEmail(name, email, subject, message);

        res.status(200).json({ success: true, message: 'Message sent successfully.' });
    } catch (error) {
        next(error);
    }
};

module.exports = { submitContactForm };
