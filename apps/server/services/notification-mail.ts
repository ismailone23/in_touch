import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const BaseURL = process.env.BaseURL || "http://localhost:3000";

export async function sendFriendRequestEmail(
  recipientEmail: string,
  requesterName: string,
  requesterId: string,
) {
  try {
    await transporter.sendMail({
      to: recipientEmail,
      subject: `New Friend Request from ${requesterName}`,
      html: `
        <h2>New Friend Request!</h2>
        <p><strong>${requesterName}</strong> sent you a friend request.</p>
        <p>
          <a href="${BaseURL}/dashboard?tab=friends" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Request
          </a>
        </p>
        <p>Log in to accept or decline the request.</p>
      `,
    });
  } catch (error) {
    console.error("Failed to send friend request email:", error);
    throw error;
  }
}

export async function sendGroupInviteEmail(
  recipientEmail: string,
  groupName: string,
  inviterName: string,
  groupId: string,
) {
  try {
    await transporter.sendMail({
      to: recipientEmail,
      subject: `You've been added to ${groupName}`,
      html: `
        <h2>Group Invitation!</h2>
        <p><strong>${inviterName}</strong> added you to the group <strong>${groupName}</strong>.</p>
        <p>
          <a href="${BaseURL}/dashboard?tab=groups&groupId=${groupId}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Join Group
          </a>
        </p>
        <p>Start chatting with your group members!</p>
      `,
    });
  } catch (error) {
    console.error("Failed to send group invite email:", error);
    throw error;
  }
}
