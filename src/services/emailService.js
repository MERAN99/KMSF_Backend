const transporter = require('../config/email');
const { welcomeEmailTemplate, announcementEmailTemplate, verificationEmailTemplate, eventNotificationTemplate } = require('../utils/emailTemplates');

/**
 * Sends a welcome email to a newly created member.
 */
const sendWelcomeEmail = async (user) => {
    try {
        const { subject, html } = welcomeEmailTemplate(user);
        await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: user.email,
            subject,
            html,
        });
        console.log(`Welcome email sent to ${user.email}`);
    } catch (error) {
        // Log but do NOT throw — email failure should not break the webhook response
        console.error(`Failed to send welcome email to ${user.email}: ${error.message}`);
    }
};

/**
 * Helper to process email sending in batches with delays to avoid SMTP blocking
 * and ensure responsive UI.
 */
const processInBatches = async (recipients, subject, html, batchSize = 10, delayMs = 1000) => {
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);

        await Promise.all(batch.map(async (recipient) => {
            try {
                await transporter.sendMail({
                    from: process.env.EMAIL_FROM,
                    to: recipient.email,
                    subject,
                    html,
                });
                sent++;
            } catch (error) {
                console.error(`Failed to send email to ${recipient.email}: ${error.message}`);
                failed++;
            }
        }));

        // Delay between batches if there are more recipients
        if (i + batchSize < recipients.length) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    console.log(`Background email process completed: ${sent} succeeded, ${failed} failed.`);
};

/**
 * Sends an announcement email to multiple recipients in the background.
 */
const sendAnnouncementEmail = (recipients, title, message) => {
    const { subject, html } = announcementEmailTemplate(title, message);

    // Fire and forget (Background processing)
    processInBatches(recipients, subject, html)
        .catch(err => console.error('Bulk announcement failed:', err));

    return { status: 'processing', total: recipients.length };
};

/**
 * Sends an email verification OTP code.
 */
const sendOTPEmail = async (email, code) => {
    try {
        const { subject, html } = verificationEmailTemplate(code);
        await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: email,
            subject,
            html,
        });
        console.log(`Verification OTP sent to ${email}`);
    } catch (error) {
        console.error(`Failed to send verification email to ${email}: ${error.message}`);
        throw new Error('Failed to send verification email.');
    }
};

/**
 * Sends an event notification email to multiple recipients in the background.
 */
const sendEventNotificationEmail = (recipients, event) => {
    const { subject, html } = eventNotificationTemplate(event);

    // Fire and forget (Background processing)
    processInBatches(recipients, subject, html)
        .catch(err => console.error('Bulk event notification failed:', err));

    return { status: 'processing', total: recipients.length };
};

/**
 * Sends a contact us message from a user to info@kmsf.org.
 */
const sendContactEmail = async (name, email, subject, message) => {
    try {
        const html = `
            <h3>New Contact Message from KMSF Website</h3>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Message:</strong></p>
            <p>${message.replace(/\n/g, '<br>')}</p>
        `;
        await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: 'info@kmsf.org', // Send to KMSF directly
            replyTo: email,      // So they can reply directly to the user
            subject: `Contact Form: ${subject} - ${name}`,
            html,
        });
        console.log(`Contact message sent from ${email}`);
    } catch (error) {
        console.error(`Failed to send contact message from ${email}: ${error.message}`);
        throw new Error('Failed to send message.');
    }
};

module.exports = { sendContactEmail, sendWelcomeEmail, sendAnnouncementEmail, sendOTPEmail, sendEventNotificationEmail };
