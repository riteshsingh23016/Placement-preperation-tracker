const axios = require('axios');

/**
 * Sends an email using Resend API if RESEND_API_KEY settings are present in the environment variables,
 * otherwise logs the email content to the console as a fallback for local development.
 * 
 * Required env keys for Resend:
 * - RESEND_API_KEY
 * - FROM_EMAIL
 */
const sendEmail = async ({ email, subject, text, html }) => {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';

  if (apiKey) {
    try {
      console.log("Sending email to:", email);

      const response = await axios.post(
        'https://api.resend.com/emails',
        {
          from: fromEmail,
          to: [email],
          subject: subject,
          html: html || text,
          text: text,
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      console.log("[RESEND EMAIL SENT]");
      console.log("Email sent successfully via Resend, message ID:", response.data.id);
      return { messageId: response.data.id, data: response.data };
    } catch (error) {
      console.log("[RESEND EMAIL FAILED]");
      const status = error.response ? error.response.status : 'No Response';
      const errorData = error.response ? JSON.stringify(error.response.data) : error.message;
      console.error(`Resend API connection failure (status: ${status}):`, errorData);
      throw new Error(`Failed to send email to ${email} via Resend. Error: ${errorData}`);
    }
  } else {
    console.log("Missing RESEND_API_KEY. Falling back to Console logging.");
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
    console.log("[RESEND EMAIL SENT]");
    return { mock: true, messageId: `mock_${Date.now()}` };
  }
};

module.exports = sendEmail;

