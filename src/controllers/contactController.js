const { sendContactEmail } = require('../services/emailService');

const submitContactForm = async (req, res, next) => {
    try {
        const { name, email, subject, message } = req.body;

        if (!name || !email || !subject || !message) {
            return res.status(400).json({ success: false, message: 'All fields are required.' });
        }

        await sendContactEmail(name, email, subject, message);

        res.status(200).json({ success: true, message: 'Message sent successfully.' });
    } catch (error) {
        next(error);
    }
};

module.exports = { submitContactForm };
