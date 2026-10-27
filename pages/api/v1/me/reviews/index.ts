import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "@/infra/controller";
import { UnauthorizedError } from "@/infra/errors";
import ReviewModel from "@/models/review";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(controller.injectAnonymousOrUser);
router.get(getHandler);

async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const user = req.context.user;

  if (("isAnonymous" in user && user.isAnonymous) || !user.id) {
    throw new UnauthorizedError();
  }

  const includeDone = req.query.include_done === "true";
  const dueReviews = await ReviewModel.listDue(user.id, { includeDone });
  const pendingCount = await ReviewModel.countPendingToday(user.id);

  return res.status(200).json({
    pending_count: pendingCount,
    reviews: dueReviews,
  });
}

export default router.handler(controller.errorHandlers);
