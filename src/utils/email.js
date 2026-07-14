const logger = require('./logger.js');
const nodemailer = require('nodemailer');
const { query } = require('../database/connection');

/**
 * Send an email using the configured SMTP credentials.
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text email body
 * @param {string} [options.html] - HTML email body (optional)
 * @param {Array} [options.attachments] - Attachments array
 */
const sendEmail = async ({ to, subject, text, html, attachments }) => {
  try {
    let smtpHost = process.env.SMTP_HOST;
    let smtpPort = process.env.SMTP_PORT || 587;
    let smtpUser = process.env.SMTP_USER;
    let smtpPass = process.env.SMTP_PASSWORD;

    // Fetch from system_settings
    const settingResult = await query("SELECT setting_value FROM system_settings WHERE setting_key = 'smtp_settings'");
    if (settingResult.rows.length > 0) {
      const dbSmtp = JSON.parse(settingResult.rows[0].setting_value);
      if (dbSmtp && dbSmtp.host && dbSmtp.user && dbSmtp.password) {
        smtpHost = dbSmtp.host;
        smtpPort = dbSmtp.port || 587;
        smtpUser = dbSmtp.user;
        smtpPass = dbSmtp.password;
      }
    }

    if (!smtpHost || !smtpUser || !smtpPass) {
      logger.warn('SMTP is not fully configured in settings. Skipping email sending.');
      throw new Error('SMTP is not fully configured in settings.');
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort == 465, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const mailOptions = {
      from: `"Security Agency System" <${smtpUser}>`,
      to,
      subject,
      text,
      html,
      attachments
    };

    let attempt = 0;
    const maxAttempts = 3;
    let lastError;

    while (attempt < maxAttempts) {
      try {
        const info = await transporter.sendMail(mailOptions);
        logger.info(`Email sent: ${info.messageId}`);
        return true;
      } catch (err) {
        attempt++;
        lastError = err;
        logger.warn(`Email send attempt ${attempt}/${maxAttempts} failed: ${err.message}`);
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Exponential backoff
        }
      }
    }

    logger.error('Send email error (all attempts failed):', lastError);
    throw lastError;
  } catch (error) {
    logger.error('Send email error:', error);
    throw error;
  }
};

module.exports = { sendEmail };
