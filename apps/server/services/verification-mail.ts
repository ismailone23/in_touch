import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
const baseUrl =
  process.env.FRONTEND_BASE_URL || process.env.BaseURL || "http://localhost:3000";
export async function sendVerificationMail(email: string, token: string) {
  try {
    const verifyUrl = `${baseUrl}/verify?token=${encodeURIComponent(token)}`;
    await transporter.sendMail({
      to: email,
      subject: "Action required: verify your In Touch account",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827; max-width: 600px; margin: 0 auto;">
          <h2 style="margin-bottom: 12px;">Welcome to In Touch</h2>
          <p>Thanks for creating an account.</p>
          <p>To activate your account and start using chat features, please verify your email address by clicking the button below.</p>
          <p style="margin: 20px 0;">
            <a href="${verifyUrl}" style="background-color: #2563eb; color: #ffffff; padding: 10px 18px; text-decoration: none; border-radius: 6px; display: inline-block;">Verify Email Address</a>
          </p>
          <p>If the button does not work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #1d4ed8;">${verifyUrl}</p>
          <p>This link expires in 1 hour.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="font-size: 13px; color: #6b7280;">You are receiving this email because someone signed up for In Touch with this address. If this was not you, you can safely ignore this message.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send verification email:", error);
    throw error;
  }
}

export async function sendPasswordResetMail(email: string, token: string) {
  try {
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
    await transporter.sendMail({
      to: email,
      subject: "Reset your In Touch password",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827; max-width: 600px; margin: 0 auto;">
          <h2 style="margin-bottom: 12px;">Password reset request</h2>
          <p>We received a request to reset your In Touch password.</p>
          <p>If you requested this, click the button below to create a new password.</p>
          <p style="margin: 20px 0;">
            <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 10px 18px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
          </p>
          <p>If the button does not work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #1d4ed8;">${resetUrl}</p>
          <p>This link expires in 30 minutes.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="font-size: 13px; color: #6b7280;">If you did not request a password reset, no further action is needed.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    throw error;
  }
}
