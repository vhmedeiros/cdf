import nodemailer from "nodemailer";

// Configuração do transporter do nodemailer
// Em desenvolvimento: conecta ao Mailcatcher (localhost:1025)
// Em produção: conecta ao servidor SMTP real configurado no .env
function getTransport() {
  const host = process.env.EMAIL_SMTP_HOST || "localhost";
  const port = Number(process.env.EMAIL_SMTP_PORT) || 1025;
  const user = process.env.EMAIL_SMTP_USER;
  const pass = process.env.EMAIL_SMTP_PASSWORD;

  const auth = user && pass ? { user, pass } : undefined;

  return nodemailer.createTransport({
    host,
    port,
    auth,
  });
}

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

async function send({ to, subject, text, html }: SendEmailInput) {
  const transporter = getTransport();
  const from = process.env.EMAIL_FROM || "suporte@aula.local";

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html: html || text,
  });

  return info;
}

const email = {
  send,
};

export default email;
