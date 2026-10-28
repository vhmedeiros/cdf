import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "@/infra/controller";
import { UnauthorizedError } from "@/infra/errors";
import DailyGoalModel from "@/models/dailyGoal";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(controller.injectAnonymousOrUser);
router.get(getHandler);
router.post(postHandler);

async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const user = req.context.user;

  if (("isAnonymous" in user && user.isAnonymous) || !user.id) {
    throw new UnauthorizedError();
  }

  const goals = await DailyGoalModel.listForUserWithProgress(user.id);
  return res.status(200).json(goals);
}

async function postHandler(req: NextApiRequest, res: NextApiResponse) {
  const user = req.context.user;

  if (("isAnonymous" in user && user.isAnonymous) || !user.id) {
    throw new UnauthorizedError();
  }

  const { subject_id, target, active_weekdays } = req.body;

  const saved = await DailyGoalModel.upsert({
    user_id: user.id,
    subject_id,
    target: typeof target === "number" ? target : undefined,
    active_weekdays: Array.isArray(active_weekdays) ? active_weekdays : undefined,
  });

  return res.status(200).json(saved);
}

export default router.handler(controller.errorHandlers);
