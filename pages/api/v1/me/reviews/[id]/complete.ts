import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "@/infra/controller";
import { UnauthorizedError, ValidationError } from "@/infra/errors";
import ReviewModel from "@/models/review";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(controller.injectAnonymousOrUser);
router.post(postHandler);

async function postHandler(req: NextApiRequest, res: NextApiResponse) {
  const user = req.context.user;

  if (("isAnonymous" in user && user.isAnonymous) || !user.id) {
    throw new UnauthorizedError();
  }

  const reviewId = req.query.id;
  if (!reviewId || typeof reviewId !== "string") {
    throw new ValidationError({
      message: "ID de revisão inválido.",
      action: "Informe um ID de revisão válido.",
    });
  }

  const updated = await ReviewModel.complete(user.id, reviewId);

  return res.status(200).json(updated);
}

export default router.handler(controller.errorHandlers);
