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
  // Simulate email failure for test user in E2E tests
  if (email === 'signup_fail_test@example.com') {
    console.log("[RESEND EMAIL FAILED]");
    throw new Error("Email delivery failed. Please verify the recipient address or try again later.");
  }

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
      const errorData = error.response ? error.response.data : null;
      const errorString = errorData ? JSON.stringify(errorData) : error.message;
      console.error(`Resend API connection failure (status: ${status}):`, errorString);

      const isSandboxError = status === 403 || (errorData && (
        errorData.statusCode === 403 ||
        errorData.name === 'validation_error' ||
        (errorData.message && errorData.message.toLowerCase().includes('testing')) ||
        (errorData.message && errorData.message.toLowerCase().includes('sandbox'))
      ));

      if (isSandboxError) {
        throw new Error("Email delivery is currently restricted by the email provider configuration. Please contact the administrator or try again later.");
      }

      throw new Error("Email delivery failed. Please verify the recipient address or try again later.");
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

