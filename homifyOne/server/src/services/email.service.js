const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

exports.sendOTP = async (toEmail, name, otp) => {
  await transporter.sendMail({
    from: `"HomifyOne" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Your HomifyOne password reset code',
    html: `
      <p>Hi ${name},</p>
      <p>Your password reset code is: <strong style="font-size:24px">${otp}</strong></p>
      <p>This code expires in 10 minutes.</p>
      <p>If you didn't request this, ignore this email.</p>
    `
  });
};