import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "@/infra/controller";
import { UnauthorizedError } from "@/infra/errors";
import CourseModel from "@/models/course";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(controller.injectAnonymousOrUser);

router.get(getHandler);

async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const user = req.context.user;

  if ("isAnonymous" in user && user.isAnonymous) {
    throw new UnauthorizedError();
  }

  const courses = await CourseModel.findEnrolledByUser(user.id);
  return res.status(200).json(courses);
}

export default router.handler(controller.errorHandlers);
