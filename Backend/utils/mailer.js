const nodemailer = require('nodemailer');

function createTransport() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;
  if (!user || !pass) {
    throw new Error('EMAIL_USER and EMAIL_PASSWORD must be set');
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });
}

async function sendMail({ to, subject, text, html, attachments }) {
  const transporter = createTransport();
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  await transporter.sendMail({ from, to, subject, text, html, attachments });
}

module.exports = { sendMail };


