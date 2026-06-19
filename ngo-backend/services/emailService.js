import nodemailer from "nodemailer";
import { Resend } from "resend";

/**
 * Email Service - Abstracts email sending with Resend + nodemailer fallback
 *
 * Priority:
 * 1. Resend API (if RESEND_API_KEY is set)
 * 2. SMTP via nodemailer (if SMTP_HOST is set)
 * 3. Ethereal test account (development fallback)
 */

let cachedTestAccount = null;

const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  try {
    return new Resend(apiKey);
  } catch (e) {
    console.error("Failed to initialize Resend client:", e.message);
    return null;
  }
};

const createNodemailerTransporter = async () => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && port && user && pass) {
    return nodemailer.createTransport({
      host,
      port: Number(port),
      secure: Number(port) === 465,
      auth: {
        user,
        pass,
      },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 5000,
    });
  }

  // Ethereal test account fallback
  if (!cachedTestAccount) {
    console.log("📧 Creating Ethereal test account...");
    cachedTestAccount = await nodemailer.createTestAccount();
    console.log("✓ Ethereal test account ready");
  }

  return nodemailer.createTransport({
    host: cachedTestAccount.smtp.host,
    port: cachedTestAccount.smtp.port,
    secure: cachedTestAccount.smtp.secure,
    auth: {
      user: cachedTestAccount.user,
      pass: cachedTestAccount.pass,
    },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000,
  });
};

const getSenderEmail = () => {
  const parseEmailAddress = (value) => {
    if (!value) return null;
    const trimmed = String(value).trim();
    const match = trimmed.match(/<([^>]+)>/);
    return match ? match[1].trim() : trimmed;
  };

  const fromAddress =
    parseEmailAddress(process.env.FROM_EMAIL) ||
    parseEmailAddress(process.env.SMTP_USER) ||
    "noreply@agbanafoundation.com";

  return `Agbana Foundation <${fromAddress}>`;
};

/**
 * Send email via Resend or nodemailer
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Plain text content
 * @param {string} html - HTML content
 * @returns {Promise<{success: boolean, isResend: boolean, isTest: boolean, previewUrl?: string, error?: string}>}
 */
export const sendEmail = async (to, subject, text, html) => {
  try {
    // Try Resend first
    const resendClient = getResendClient();
    if (resendClient) {
      try {
        const result = await resendClient.emails.send({
          from: getSenderEmail(),
          to,
          subject,
          html,
          text,
        });

        if (result.error) {
          console.error("✗ Resend error:", result.error);
          return {
            success: false,
            isResend: true,
            error: result.error.message,
          };
        }

        console.info(`✓ Email sent via Resend to ${to}`);
        return { success: true, isResend: true, isTest: false };
      } catch (e) {
        console.error("✗ Resend send failed:", e.message);
        return { success: false, isResend: true, error: e.message };
      }
    }

    // Fallback to nodemailer
    const transporter = await createNodemailerTransporter();
    const info = await transporter.sendMail({
      from: getSenderEmail(),
      to,
      subject,
      text,
      html,
    });

    const isTest = !process.env.SMTP_HOST && cachedTestAccount;
    if (isTest) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.info("✓ Test email sent - Preview URL:", previewUrl);
      return {
        success: true,
        isResend: false,
        isTest: true,
        previewUrl,
        testAccountEmail: cachedTestAccount.user,
      };
    }

    console.info(`✓ Email sent via nodemailer to ${to}`);
    return { success: true, isResend: false, isTest: false };
  } catch (e) {
    console.error("✗ Failed to send email:", e.message);
    return { success: false, isResend: false, isTest: false, error: e.message };
  }
};

/**
 * Send verification email
 */
export const getVerificationBaseUrl = () => {
  return (
    process.env.BACKEND_URL ||
    process.env.API_BASE_URL ||
    "http://localhost:5000"
  );
};

export const sendVerificationEmail = async (to, username, token) => {
  const verificationBaseUrl = getVerificationBaseUrl();
  const verifyLink = `${verificationBaseUrl}/auth/verify?token=${token}`;

  const text = `Hello ${username},\n\nThanks for registering. Please verify your email by visiting the link below:\n\n${verifyLink}\n\nYour username is ${username}.\n\nIf you didn't request this, ignore this message.`;

  const html = `<p>Hello ${username},</p><p>Thanks for registering. Please verify your email by clicking the link below:</p><p><a href="${verifyLink}" target="_blank" rel="noopener noreferrer">${verifyLink}</a></p><p>Your username is <strong>${username}</strong>.</p><p>If clicking the link does not open correctly, right-click and open it in a new tab or copy-paste the URL into your browser.</p><p>If you didn't request this, ignore this message.</p>`;

  return sendEmail(to, "Verify your account", text, html);
};

/**
 * Send approval email
 */
const getClientUrl = () => {
  return process.env.CLIENT_URL;
};

export const sendApprovalEmail = async (to, username) => {
  const clientUrl = getClientUrl();
  const loginLink = `${clientUrl}/login`;

  const text = `Hello ${username},\n\nCongratulations! Your account has been approved by an administrator. You can now log in to the NGO Beneficiary Management System.\n\nOpen or copy this URL in your browser:\n${loginLink}\n\nUsername: ${username}\n\nIf you have any questions, please contact the administrator.`;

  const html = `<p>Hello ${username},</p><p>Congratulations! Your account has been <strong>approved</strong> by an administrator.</p><p>You can now log in to the NGO Beneficiary Management System:</p><p><a href="${loginLink}" target="_blank" rel="noopener noreferrer">${loginLink}</a></p><p><strong>Username:</strong> ${username}</p><p>If the link does not open correctly, right-click and open it in a new tab or copy-paste the URL into your browser.</p><p>If you have any questions, please contact the administrator.</p>`;

  return sendEmail(to, "Your account has been approved", text, html);
};

export const sendWelcomeEmail = async (to, username, isApproved) => {
  const clientUrl = getClientUrl();
  const loginLink = `${clientUrl}/login`;

  const text = isApproved
    ? `Hello ${username},\n\nYour email has been verified and your account is approved. You can now log in at:\n\n${loginLink}\n\nUsername: ${username}`
    : `Hello ${username},\n\nYour email has been verified. An administrator will review and approve your account soon. You will receive another email once your account is approved.`;

  const html = isApproved
    ? `<p>Hello ${username},</p><p>Your email has been verified and your account is approved. You can now log in at the link below:</p><p><a href="${loginLink}" target="_blank" rel="noopener noreferrer">${loginLink}</a></p><p><strong>Username:</strong> ${username}</p>`
    : `<p>Hello ${username},</p><p>Your email has been verified. An administrator will review and approve your account soon.</p><p>You will receive another email once your account is approved.</p>`;

  return sendEmail(to, "Welcome to Agbana Foundation", text, html);
};

export const sendPasswordResetEmail = async (to, username, token) => {
  const clientUrl = getClientUrl();
  const resetLink = `${clientUrl}/reset-password?token=${token}`;

  const text = `Hello ${username},\n\nWe received a request to reset your password. Click the link below to choose a new one:\n\n${resetLink}\n\nIf you did not request this, please ignore this email. The link will expire in 1 hour.`;

  const html = `<p>Hello ${username},</p><p>We received a request to reset your password. Click the link below to choose a new one:</p><p><a href="${resetLink}" target="_blank" rel="noopener noreferrer">Reset your password</a></p><p>If the link does not open correctly, copy and paste the URL into your browser:</p><p>${resetLink}</p><p>This link will expire in 1 hour. If you did not request a password reset, please ignore this message.</p>`;

  return sendEmail(to, "Reset your password", text, html);
};

export const sendDisapprovalEmail = async (to, username) => {
  const text = `Hello ${username},\n\nWe reviewed your account registration and it was not approved. If you believe this is an error, please contact the administrator.`;
  const html = `<p>Hello ${username},</p><p>We reviewed your account registration and it was <strong>not approved</strong>. If you believe this is an error, please contact the administrator.</p>`;
  return sendEmail(to, "Account not approved", text, html);
};
/**
 * Initialize email service at startup
 */
export const initializeEmailService = async () => {
  const resendClient = getResendClient();
  if (resendClient) {
    console.log("📧 Using Resend for email delivery");
    return;
  }

  if (process.env.SMTP_HOST) {
    console.log("📧 Using SMTP for email delivery");
    return;
  }

  console.log("📧 Initializing Ethereal test email account...");
  try {
    if (!cachedTestAccount) {
      cachedTestAccount = await nodemailer.createTestAccount();
    }
    console.log("✓ Email service initialized (test mode)");
  } catch (error) {
    console.warn("⚠ Email service initialization failed:", error.message);
  }
};

/**
 * Validate email configuration at startup
 */
export const validateEmailConfig = () => {
  const nodeEnv = process.env.NODE_ENV || "development";
  const clientUrl = process.env.CLIENT_URL;
  const resendApiKey = process.env.RESEND_API_KEY;
  const smtpHost = process.env.SMTP_HOST;

  if (nodeEnv === "production") {
    if (!clientUrl) {
      console.error(
        "✗ CLIENT_URL is not set. Set CLIENT_URL to your frontend URL in production.",
      );
      process.exit(1);
    }
    if (!resendApiKey && !smtpHost) {
      console.warn(
        "⚠ WARNING: Neither RESEND_API_KEY nor SMTP_HOST is configured. Emails will use Ethereal test service (emails won't be delivered).",
      );
    }
  }

  console.log(
    `📧 Email Config: CLIENT_URL=${clientUrl || "(using default)"}, Provider=${
      resendApiKey ? "Resend" : smtpHost ? "SMTP" : "Ethereal (test)"
    }`,
  );
};
