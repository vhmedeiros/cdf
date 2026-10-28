import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "@/infra/controller";
import QuestionModel from "@/models/question";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(controller.injectAnonymousOrUser);
router.get(getHandler);

async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const user = req.context.user;
  const isUserAuthenticated = !("isAnonymous" in user && user.isAnonymous);

  if (typeof id !== "string") {
    return res.status(400).json({ message: "ID da questão inválido." });
  }

  const question = await QuestionModel.findById(id, isUserAuthenticated ? user.id : undefined);
  return res.status(200).json(question);
}

export default router.handler(controller.errorHandlers);
