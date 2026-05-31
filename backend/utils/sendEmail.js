const nodemailer = require('nodemailer');

/**
 * Sends an email using Nodemailer if SMTP settings are present in the environment variables,
 * otherwise logs the email content to the console as a fallback for local development.
 * 
 * Required env keys for SMTP:
 * - SMTP_HOST
 * - SMTP_PORT
 * - SMTP_USER
 * - SMTP_PASS
 */
const sendEmail = async ({ email, subject, text, html }) => {
  const isSmtpConfigured = 
    process.env.SMTP_HOST && 
    process.env.SMTP_PORT && 
    process.env.SMTP_USER && 
    process.env.SMTP_PASS;

  if (isSmtpConfigured) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT, 10),
        secure: process.env.SMTP_SECURE === 'true' || parseInt(process.env.SMTP_PORT, 10) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const fromName = process.env.FROM_NAME || 'Placement Prep Tracker';
      const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER;

      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: email,
        subject,
        text,
        html,
      });

      console.log(`[Email Service] Sent email to ${email}. Message ID: ${info.messageId}`);
      return info;
    } catch (error) {
      console.error(`[Email Service] SMTP error sending to ${email}:`, error.message);
      // Fail gracefully or throw? For auth flows, we throw to propagate back to user
      throw new Error(`Failed to send email to ${email}. Error: ${error.message}`);
    }
  } else {
    // Graceful fallback to console logging for local testing/dev environments
    console.log('\n==================================================');
    console.log('📬  [DEVELOPMENT MOCK EMAIL SENT]');
    console.log(`To:      ${email}`);
    console.log(`Subject: ${subject}`);
    console.log('--------------------------------------------------');
    console.log(`Text:\n${text}`);
    if (html) {
      console.log('--------------------------------------------------');
      console.log(`HTML:\n${html}`);
    }
    console.log('==================================================\n');
    return { mock: true, messageId: `mock_${Date.now()}` };
  }
};

module.exports = sendEmail;
