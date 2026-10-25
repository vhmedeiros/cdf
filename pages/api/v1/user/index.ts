import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "@/infra/controller";
import { UnauthorizedError } from "@/infra/errors";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(controller.injectAnonymousOrUser);

// GET /api/v1/user — Retorna o usuário da sessão atual ("quem sou eu?")
// Análogo ao request.user do Django em uma view protegida
router.get(getHandler);

async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const user = req.context.user;

  if ("isAnonymous" in user && user.isAnonymous) {
    throw new UnauthorizedError();
  }

  return res.status(200).json(user);
}

export default router.handler(controller.errorHandlers);
