/**
 * HTML email templates for the KMSF system.
 */

const welcomeEmailTemplate = (user) => ({
  subject: 'Welcome to KMSF — Your Membership is Active!',
  html: `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to KMSF</title>
    <style>
      body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
      .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
      .header { background: #1a3c5e; padding: 32px; text-align: center; }
      .header h1 { color: #fff; margin: 0; font-size: 28px; }
      .body { padding: 32px; color: #333; }
      .body h2 { color: #1a3c5e; }
      .info-box { background: #f0f7ff; border-left: 4px solid #1a3c5e; padding: 16px; border-radius: 4px; margin: 20px 0; }
      .info-box p { margin: 6px 0; font-size: 15px; }
      .info-box strong { color: #1a3c5e; }
      .footer { background: #f4f4f4; text-align: center; padding: 16px; font-size: 12px; color: #888; }
    </style>
    </head>
    <body>
    <div class="container">
      <div class="header"><h1>KMSF Membership</h1></div>
      <div class="body">
        <h2>Welcome, ${user.title} ${user.firstName} ${user.lastName}!</h2>
        <p>Your membership has been successfully activated. Here are your membership details:</p>
        <div class="info-box">
          <p><strong>Member ID:</strong> ${user.memberId}</p>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Organization:</strong> ${user.organization}</p>
          <p><strong>Speciality:</strong> ${user.speciality}</p>
          <p><strong>Branch:</strong> ${user.branch}</p>
          <p><strong>Membership Status:</strong> Active</p>
          <p><strong>Subscription End Date:</strong> ${new Date(user.subscriptionEndDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
        </div>
        <p>Please keep your Member ID safe — you will need it for KMSF services and events.</p>
        <p>Your subscription will automatically renew each month. If you have any questions, please contact us.</p>
        <p style="margin-top:32px;">Best regards,<br><strong>The KMSF Team</strong></p>
      </div>
      <div class="footer">© ${new Date().getFullYear()} KMSF. All rights reserved.</div>
    </div>
    </body></html>
  `,
});

const announcementEmailTemplate = (title, message) => ({
  subject: `KMSF Announcement: ${title}`,
  html: `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KMSF Announcement</title>
    <style>
      body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
      .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
      .header { background: #1a3c5e; padding: 32px; text-align: center; }
      .header h1 { color: #fff; margin: 0; font-size: 24px; }
      .body { padding: 32px; color: #333; line-height: 1.7; }
      .footer { background: #f4f4f4; text-align: center; padding: 16px; font-size: 12px; color: #888; }
    </style>
    </head>
    <body>
    <div class="container">
      <div class="header"><h1>KMSF Announcement</h1></div>
      <div class="body">
        <h2 style="color:#1a3c5e;">${title}</h2>
        <p>${message.replace(/\n/g, '<br>')}</p>
        <p style="margin-top:32px;">Best regards,<br><strong>The KMSF Team</strong></p>
      </div>
      <div class="footer">© ${new Date().getFullYear()} KMSF. All rights reserved. You are receiving this because you are a KMSF member.</div>
    </div>
    </body></html>
  `,
});

const verificationEmailTemplate = (code) => ({
  subject: 'KMSF — Your Email Verification Code',
  html: `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification</title>
    <style>
      body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
      .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
      .header { background: #15314b; padding: 32px; text-align: center; }
      .header h1 { color: #fff; margin: 0; font-size: 24px; }
      .body { padding: 32px; color: #333; text-align: center; }
      .code { font-size: 32px; font-weight: bold; color: #15314b; letter-spacing: 4px; padding: 20px; background: #f0f7ff; border-radius: 8px; display: inline-block; margin: 20px 0; }
      .footer { background: #f4f4f4; text-align: center; padding: 16px; font-size: 12px; color: #888; }
    </style>
    </head>
    <body>
    <div class="container">
      <div class="header"><h1>KMSF Verification</h1></div>
      <div class="body">
        <h2 style="color:#15314b;">Verify Your Email</h2>
        <p>Use the following code to verify your email address. This code is valid for 10 minutes.</p>
        <div class="code">${code}</div>
        <p>If you did not request this code, please ignore this email.</p>
      </div>
      <div class="footer">© ${new Date().getFullYear()} KMSF. All rights reserved.</div>
    </div>
    </body></html>
  `,
});

const eventNotificationTemplate = (event) => ({
  subject: `KMSF New Event: ${event.title}`,
  html: `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KMSF Event Notification</title>
    <style>
      body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
      .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
      .header { background: #1a3c5e; padding: 32px; text-align: center; }
      .header h1 { color: #fff; margin: 0; font-size: 24px; }
      .body { padding: 32px; color: #333; line-height: 1.7; }
      .event-card { background: #f9f9f9; border: 1px solid #eee; border-radius: 8px; padding: 20px; margin: 20px 0; }
      .event-title { color: #1a3c5e; font-size: 20px; margin-top: 0; }
      .event-detail { margin: 8px 0; font-size: 15px; }
      .event-detail strong { color: #1a3c5e; }
      .cta-button { display: inline-block; background: #C8A441; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold; margin-top: 20px; }
      .footer { background: #f4f4f4; text-align: center; padding: 16px; font-size: 12px; color: #888; }
    </style>
    </head>
    <body>
    <div class="container">
      <div class="header"><h1>New Event Notification</h1></div>
      <div class="body">
        <p>Hello,</p>
        <p>We are excited to announce a new event from KMSF. Here are the details:</p>
        <div class="event-card">
          <h2 class="event-title">${event.title}</h2>
          <p class="event-detail"><strong>Date:</strong> ${new Date(event.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
          <p class="event-detail"><strong>Time:</strong> ${event.time}</p>
          <p class="event-detail"><strong>Location:</strong> ${event.location}</p>
          <p class="event-detail"><strong>Description:</strong> ${event.description}</p>
        </div>
        <p>We look forward to seeing you there!</p>
        <a href="http://localhost:5173/events" class="cta-button">View More Events</a>
        <p style="margin-top:32px;">Best regards,<br><strong>The KMSF Team</strong></p>
      </div>
      <div class="footer">© ${new Date().getFullYear()} KMSF. All rights reserved. You are receiving this because you are a KMSF member.</div>
    </div>
    </body></html>
  `,
});

module.exports = { welcomeEmailTemplate, announcementEmailTemplate, verificationEmailTemplate, eventNotificationTemplate };
