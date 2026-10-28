import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import bcrypt from "bcryptjs";
import { z } from "zod";
import controller from "@/infra/controller";
import database from "@/infra/database";
import { UnauthorizedError, ValidationError } from "@/infra/errors";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(controller.injectAnonymousOrUser);
router.patch(patchHandler);

const ChangePasswordSchema = z.object({
  current_password: z.string().optional(),
  new_password: z
    .string()
    .min(8, "A nova senha deve ter no mínimo 8 caracteres.")
    .max(72, "A nova senha deve ter no máximo 72 caracteres."),
});

async function patchHandler(req: NextApiRequest, res: NextApiResponse) {
  const user = req.context.user;

  if (("isAnonymous" in user && user.isAnonymous) || !user.id) {
    throw new UnauthorizedError({ message: "Você precisa estar conectado para alterar a senha." });
  }

  const parsed = ChangePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError({ message: parsed.error.issues[0].message });
  }

  const { current_password, new_password } = parsed.data;

  // Busca hash atual do usuário
  const userQuery = await database.query<{ password: string }>(
    `SELECT password FROM users WHERE id = $1 LIMIT 1`,
    [user.id],
  );

  const dbUser = userQuery.rows[0];
  if (!dbUser) {
    throw new UnauthorizedError();
  }

  // Se informou a senha atual, valida
  if (current_password) {
    const isValid = await bcrypt.compare(current_password, dbUser.password);
    if (!isValid) {
      throw new ValidationError({ message: "A senha atual informada está incorreta." });
    }
  }

  // Criptografa e grava a nova senha
  const newHash = await bcrypt.hash(new_password, 10);
  await database.query(`UPDATE users SET password = $1, updated_at = now() WHERE id = $2`, [
    newHash,
    user.id,
  ]);

  return res.status(200).json({ message: "Senha atualizada com sucesso!" });
}

export default router.handler(controller.errorHandlers);
