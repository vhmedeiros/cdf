import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "@/infra/controller";
import { ValidationError } from "@/infra/errors";
import Invite from "@/models/invite";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(controller.injectAnonymousOrUser);
router.delete(controller.canRequest("create:invite"), deleteHandler);

async function deleteHandler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };

  if (!id || typeof id !== "string") {
    throw new ValidationError({ message: "ID do convite inválido." });
  }

  await Invite.deleteById(id);

  return res.status(200).json({
    success: true,
    message: "Convite revogado/removido com sucesso.",
  });
}

export default router.handler(controller.errorHandlers);
