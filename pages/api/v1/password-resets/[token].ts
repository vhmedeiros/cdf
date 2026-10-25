import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import { z } from "zod";
import controller from "@/infra/controller";
import { NotFoundError, ValidationError, CustomError } from "@/infra/errors";
import PasswordReset from "@/models/passwordReset";
import User from "@/models/user";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(controller.injectAnonymousOrUser);

class GoneError extends CustomError {
  constructor() {
    super({
      name: "GoneError",
      message: "Este link de redefinição já foi utilizado.",
      action: "Solicite um novo link de redefinição de senha.",
      statusCode: 410,
    });
  }
}

router.patch(patchHandler);

const ResetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "A nova senha deve ter no mínimo 8 caracteres.")
    .max(72, "A nova senha deve ter no máximo 72 caracteres."),
});

async function patchHandler(req: NextApiRequest, res: NextApiResponse) {
  const { token } = req.query as { token: string };

  const passwordReset = await PasswordReset.findByToken(token);

  if (!passwordReset) {
    throw new NotFoundError({
      message: "Link de redefinição não encontrado ou inválido.",
      action: "Verifique o link ou solicite uma nova redefinição.",
    });
  }

  if (passwordReset.used_at) {
    throw new GoneError();
  }

  if (passwordReset.expires_at < new Date()) {
    throw new ValidationError({
      message: "Este link de redefinição expirou.",
      action: "Solicite um novo link de redefinição de senha.",
    });
  }

  const parsed = ResetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError({ message: parsed.error.issues[0].message });
  }

  const { password } = parsed.data;

  // Atualiza a senha do usuário com hash bcrypt
  await User.updatePassword(passwordReset.user_id, password);

  // Invalida o token de reset marcando-o como usado
  await PasswordReset.markAsUsed(token);

  return res.status(200).json({
    message: "Senha alterada com sucesso! Você já pode fazer login.",
  });
}

export default router.handler(controller.errorHandlers);
