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

  if (("isAnonymous" in user && user.isAnonymous) || !user.id) {
    throw new UnauthorizedError();
  }

  const isAdmin = Boolean(
    user.features?.includes("read:course:all") ||
      user.features?.includes("create:course") ||
      user.features?.includes("create:invite"),
  );

  // Se for administrador, visualiza todos os cursos cadastrados
  if (isAdmin) {
    const courses = await CourseModel.findAll();
    return res.status(200).json(courses);
  }

  const courses = await CourseModel.findEnrolledByUser(user.id);
  return res.status(200).json(courses);
}

export default router.handler(controller.errorHandlers);
