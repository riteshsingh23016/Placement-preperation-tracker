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
      const host = (process.env.SMTP_HOST || '').trim().replace(/^["']|["']$/g, '');
      const portVal = (process.env.SMTP_PORT || '').toString().trim().replace(/^["']|["']$/g, '');
      const port = parseInt(portVal, 10) || 587;
      const secureVal = (process.env.SMTP_SECURE || '').toString().trim().replace(/^["']|["']$/g, '').toLowerCase();
      const secure = secureVal === 'true' || port === 465;
      const user = (process.env.SMTP_USER || '').trim().replace(/^["']|["']$/g, '');
      
      // Sanitize app password by stripping spaces and quotes
      let pass = (process.env.SMTP_PASS || '');
      pass = pass.trim().replace(/^["']|["']$/g, '').replace(/\s+/g, '');

      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
      });

      // Verify connection configuration
      await transporter.verify();
      console.log("[SMTP CONNECTED]");
      console.log("SMTP connection success");

      const fromName = process.env.FROM_NAME || 'Placement Prep Tracker';
      const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER;

      console.log("Sending OTP to:", email);

      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: email,
        subject,
        text,
        html,
      });

      console.log("[EMAIL SENT]");
      console.log("Email sent:", info.messageId);
      return info;
    } catch (error) {
      console.log("[EMAIL FAILED]");
      if (error.code === 'EAUTH' || error.message.toLowerCase().includes('auth') || error.message.toLowerCase().includes('password')) {
        console.error("SMTP authentication failure:", error.message);
      } else {
        console.error("SMTP connection/configuration failure:", error);
      }
      // Fail gracefully or throw? For auth flows, we throw to propagate back to user
      throw new Error(`Failed to send email to ${email}. Error: ${error.message}`);
    }
  } else {
    console.log("Missing SMTP credentials. Falling back to Console logging.");
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
    console.log("[EMAIL SENT]");
    return { mock: true, messageId: `mock_${Date.now()}` };
  }
};

module.exports = sendEmail;
