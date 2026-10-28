import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "@/infra/controller";
import { NotFoundError, ValidationError, ForbiddenError } from "@/infra/errors";
import User from "@/models/user";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(controller.injectAnonymousOrUser);
router.delete(controller.canRequest("create:invite"), deleteHandler);

async function deleteHandler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };
  const currentUser = req.context.user as any;

  if (!id || typeof id !== "string") {
    throw new ValidationError({ message: "ID do usuário inválido." });
  }

  // Prevenir que o administrador exclua sua própria conta
  if (currentUser?.id === id) {
    throw new ForbiddenError({
      message: "Você não pode excluir sua própria conta de administrador.",
    });
  }

  const targetUser = await User.findById(id);
  if (!targetUser) {
    throw new NotFoundError({ message: "Usuário não encontrado." });
  }

  await User.deleteUser(id);

  return res.status(200).json({
    success: true,
    message: `Usuário "${targetUser.display_name || targetUser.email}" excluído com sucesso.`,
  });
}

export default router.handler(controller.errorHandlers);
