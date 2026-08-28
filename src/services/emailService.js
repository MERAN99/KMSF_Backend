const { transporter, brevoTransporter } = require('../config/email');
const { welcomeEmailTemplate, announcementEmailTemplate, verificationEmailTemplate, eventNotificationTemplate, registrationReminderTemplate } = require('../utils/emailTemplates');

// ─── Security Helper ─────────────────────────────────────────────────────────────────────────
// Escapes HTML special characters to prevent XSS in email bodies (H6, M4)
const escapeHtml = (str) => String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

/**
 * Sends a welcome email to a newly created member.
 */
const sendWelcomeEmail = async (user) => {
    try {
        const { subject, html } = welcomeEmailTemplate(user);
        await brevoTransporter.sendMail({
            from: process.env.BREVO_FROM || process.env.EMAIL_FROM,
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
                await brevoTransporter.sendMail({
                    from: process.env.BREVO_FROM || process.env.EMAIL_FROM,
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
        await brevoTransporter.sendMail({
            from: process.env.BREVO_FROM || process.env.EMAIL_FROM,
            to: email,
            subject,
            html,
        });
        console.log(`Verification OTP sent to ${email} (via Brevo)`);
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
        // H6: Escape all user-supplied values before inserting into HTML
        const html = `
            <h3>New Contact Message from KMSF Website</h3>
            <p><strong>Name:</strong> ${escapeHtml(name)}</p>
            <p><strong>Email:</strong> ${escapeHtml(email)}</p>
            <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
            <p><strong>Message:</strong></p>
            <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
        `;
        await brevoTransporter.sendMail({
            from: process.env.BREVO_FROM || process.env.EMAIL_FROM,
            to: 'Info@kmsf.org.uk', // Send to KMSF directly
            replyTo: email,      // So they can reply directly to the user
            subject: `Contact Form: ${escapeHtml(subject)} - ${escapeHtml(name)}`,
            html,
        });
        console.log(`Contact message sent from ${email.split('@')[0].slice(0, 3)}***@${email.split('@')[1]}`);
    } catch (error) {
        console.error(`Failed to send contact message: ${error.message}`);
        throw new Error('Failed to send message.');
    }
};

/**
 * Sends custom bulk emails to multiple recipients in the background.
 */
const sendBulkEmail = (recipients, title, message) => {
    // M4: Escape admin-supplied title and message to prevent HTML injection
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #F59E0B; text-align: center;">${escapeHtml(title)}</h2>
            <div style="color: #333; line-height: 1.6; white-space: pre-wrap; font-size: 16px;">
                ${escapeHtml(message)}
            </div>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
            <p style="color: #999; font-size: 12px; text-align: center;">
                You are receiving this email because you are a registered user of KMSF.
            </p>
        </div>
    `;

    // Fire and forget (Background processing)
    processInBatches(recipients, title, html)
        .catch(err => console.error('Bulk email failed:', err));

    return { status: 'processing', total: recipients.length };
};

module.exports = { sendContactEmail, sendWelcomeEmail, sendAnnouncementEmail, sendOTPEmail, sendEventNotificationEmail, sendBulkEmail };
