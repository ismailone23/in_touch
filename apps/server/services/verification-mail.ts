import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
const BaseURL = process.env.BaseURL;
export async function sendVerificationMail(email: string, token: string) {
  try {
    await transporter.sendMail({
      to: email,
      subject: "Verify your account",
      html: `<a href="${BaseURL}/auth/verify?token=${token}">Verify</a>`,
    });
  } catch (error) {
    console.error("Failed to send verification email:", error);
    throw error;
  }
}
