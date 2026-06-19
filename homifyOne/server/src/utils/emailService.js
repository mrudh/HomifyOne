const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.sendOTP = async (toEmail, name, otp) => {
  await transporter.sendMail({
    from: `"HomifyOne" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Your HomifyOne Password Reset Code',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px">
        <h2 style="color:#1a4a45;margin-bottom:4px">HomifyOne</h2>
        <p style="color:#6b7280;margin-top:0">Password Reset Request</p>
        <p>Hi <strong>${name}</strong>,</p>
        <p>Use the code below to reset your password. It expires in <strong>10 minutes</strong>.</p>
        <div style="font-size:40px;font-weight:bold;letter-spacing:14px;color:#1a4a45;margin:24px 0;text-align:center">
          ${otp}
        </div>
        <p style="color:#6b7280;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
        <p style="color:#9ca3af;font-size:12px;text-align:center">© 2026 HomifyOne. All rights reserved.</p>
      </div>
    `,
  });
};