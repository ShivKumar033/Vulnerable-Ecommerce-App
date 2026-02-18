// ──────────────────────────────────────────────────────────────
// Mock Email Utility
// Simulates sending emails by logging them to console and audit log.
// In production, this would use Nodemailer or similar.
// ──────────────────────────────────────────────────────────────

import { createAuditLog } from './auditLog.js';

/**
 * Send a mock email.
 * @param {object} params
 * @param {string} params.to       - Recipient email
 * @param {string} params.subject  - Email subject
 * @param {string} params.body     - Email body (HTML or text)
 * @param {string} [params.from]   - Sender email
 * @param {object} [params.req]    - Express request for audit logging
 */
async function sendEmail({ to, subject, body, from, req }) {
    const emailData = {
        from: from || process.env.SMTP_USER || 'noreply@vulnerable-ecommerce.local',
        to,
        subject,
        body,
        sentAt: new Date().toISOString(),
    };

    // Log the email to console (mock)
    console.log('──────────────────────────────────────');
    console.log('📧 MOCK EMAIL SENT');
    console.log(`   To:      ${emailData.to}`);
    console.log(`   From:    ${emailData.from}`);
    console.log(`   Subject: ${emailData.subject}`);
    console.log(`   Body:    ${emailData.body.substring(0, 200)}...`);
    console.log('──────────────────────────────────────');

    // Audit log the email send
    await createAuditLog({
        action: 'EMAIL_SENT',
        entity: 'Email',
        // VULNERABLE: Logging full email body (may contain tokens, PII)
        // Maps to: OWASP A09:2021 – Security Logging and Monitoring Failures
        metadata: emailData,
        req,
    });

    return emailData;
}

/**
 * Send order confirmation email (mock).
 */
async function sendOrderConfirmation({ to, orderNumber, totalAmount, items, req }) {
    const itemList = items.map((i) => `  - ${i.product}: ${i.quantity} x $${i.price}`).join('\n');
    const body = `
        <h2>Order Confirmation</h2>
        <p>Thank you for your order!</p>
        <p><strong>Order #:</strong> ${orderNumber}</p>
        <p><strong>Total:</strong> $${totalAmount}</p>
        <h3>Items:</h3>
        <pre>${itemList}</pre>
        <p>You can track your order in your account dashboard.</p>
    `;

    return sendEmail({ to, subject: `Order Confirmation - ${orderNumber}`, body, req });
}

/**
 * Send password reset email (mock).
 */
async function sendPasswordResetEmail({ to, resetToken, req }) {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    const body = `
        <h2>Password Reset</h2>
        <p>You requested a password reset. Click the link below:</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>This link expires in 1 hour.</p>
        <p>If you didn't request this, ignore this email.</p>
    `;

    return sendEmail({ to, subject: 'Password Reset Request', body, req });
}

/**
 * Send email verification (mock).
 */
async function sendVerificationEmail({ to, verificationToken, req }) {
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;
    const body = `
        <h2>Email Verification</h2>
        <p>Please verify your email address by clicking the link below:</p>
        <a href="${verifyUrl}">${verifyUrl}</a>
    `;

    return sendEmail({ to, subject: 'Verify Your Email', body, req });
}

export {
    sendEmail,
    sendOrderConfirmation,
    sendPasswordResetEmail,
    sendVerificationEmail,
};
