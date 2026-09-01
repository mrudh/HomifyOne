const nodemailer = require('nodemailer');
const path = require('path');
 
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
 
const BRAND_GREEN = '#1a4a45';
 

const LOGO_PATH = path.join(__dirname, '../../../client/src/assets/homifyone-email-logo.png');
 
const logoAttachment = {
  filename: 'homifyone-email-logo.png',
  path: LOGO_PATH,
  cid: 'homifyone-email-logo', 
};
 

const emailHeader = `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND_GREEN};border-radius:12px 12px 0 0">
    <tr>
      <td style="padding:20px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-right:10px;vertical-align:middle;">
              <img src="cid:homifyone-email-logo" width="36" height="36" alt="HomifyOne logo" style="display:block;border-radius:6px" />
            </td>
            <td style="vertical-align:middle;">
              <span style="color:#ffffff;font-size:22px;font-weight:800;font-family:sans-serif;letter-spacing:-0.3px;">HomifyOne</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
`;
 
const wrapBody = (innerHtml) => `
  <div style="font-family:sans-serif;max-width:480px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
    ${emailHeader}
    <div style="padding:32px;background:#ffffff">
      ${innerHtml}
    </div>
  </div>
`;
 
exports.sendOTP = async (toEmail, name, otp) => {
  await transporter.sendMail({
    from: `"HomifyOne" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Your HomifyOne Password Reset Code',
    html: wrapBody(`
      <p style="color:#6b7280;margin-top:0">Password Reset Request</p>
      <p>Hi <strong>${name}</strong>,</p>
      <p>Use the code below to reset your password. It expires in <strong>10 minutes</strong>.</p>
      <div style="font-size:40px;font-weight:bold;letter-spacing:14px;color:${BRAND_GREEN};margin:24px 0;text-align:center">
        ${otp}
      </div>
      <p style="color:#6b7280;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
      <p style="color:#9ca3af;font-size:12px;text-align:center">© 2026 HomifyOne. All rights reserved.</p>
    `),
    attachments: [logoAttachment],
  });
};
 
exports.sendNotificationEmail = async (toEmail, name, subject, message) => {
  await transporter.sendMail({
    from: `"HomifyOne" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject,
    html: wrapBody(`
      <p>Hi <strong>${name}</strong>,</p>
      <p>${message}</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
      <p style="color:#9ca3af;font-size:12px;text-align:center">© 2026 HomifyOne. All rights reserved.</p>
    `),
    attachments: [logoAttachment],
  });
};