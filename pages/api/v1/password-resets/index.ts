import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import { z } from "zod";
import controller from "@/infra/controller";
import emailService from "@/infra/email";
import { ValidationError } from "@/infra/errors";
import PasswordReset from "@/models/passwordReset";
import User from "@/models/user";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(controller.injectAnonymousOrUser);

router.post(postHandler);

const RequestPasswordResetSchema = z.object({
  email: z.string().email("E-mail inválido."),
});

async function postHandler(req: NextApiRequest, res: NextApiResponse) {
  const parsed = RequestPasswordResetSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError({ message: parsed.error.issues[0].message });
  }

  const { email } = parsed.data;
  const user = await User.findByEmail(email);

  let resetToken: string | undefined;

  // Por segurança, se o e-mail não existir, não revelamos isso ao cliente.
  // Retornamos a mesma resposta de sucesso para evitar "user enumeration".
  if (user) {
    const passwordReset = await PasswordReset.create(user.id);
    resetToken = passwordReset.token;

    const webserverOrigin = process.env.WEBSERVER_ORIGIN || "http://localhost:3000";
    const resetUrl = `${webserverOrigin}/redefinir-senha?token=${resetToken}`;

    await emailService.send({
      to: user.email,
      subject: "Redefinição de senha — Plataforma CDF",
      text: `Olá ${user.display_name},\n\nRecebemos uma solicitação para redefinir a sua senha.\nClique no link abaixo para criar uma nova senha:\n${resetUrl}\n\nSe você não solicitou, ignore esta mensagem.`,
      html: `
        <p>Olá <strong>${user.display_name}</strong>,</p>
        <p>Recebemos uma solicitação para redefinir a sua senha.</p>
        <p><a href="${resetUrl}">Clique aqui para redefinir sua senha</a></p>
        <p>Se você não solicitou esta alteração, ignore este e-mail.</p>
      `,
    });
  }

  return res.status(200).json({
    message: "Se o e-mail informado estiver cadastrado, você receberá as instruções em instantes.",
    // Em dev/test, retornamos o token para facilitar a validação nos testes de integração
    token: process.env.NODE_ENV !== "production" ? resetToken : undefined,
  });
}

export default router.handler(controller.errorHandlers);
