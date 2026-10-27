import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "@/infra/controller";
import { UnauthorizedError } from "@/infra/errors";
import SearchModel from "@/models/search";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(controller.injectAnonymousOrUser);
router.get(getHandler);

async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const user = req.context.user;

  if (("isAnonymous" in user && user.isAnonymous) || !user.id) {
    throw new UnauthorizedError();
  }

  const query = typeof req.query.q === "string" ? req.query.q : "";
  const results = await SearchModel.searchAll(user.id, query);

  return res.status(200).json(results);
}

export default router.handler(controller.errorHandlers);
