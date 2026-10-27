import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "@/infra/controller";
import { UnauthorizedError, ValidationError } from "@/infra/errors";
import ProgressModel from "@/models/progress";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(controller.injectAnonymousOrUser);

router.get(getHandler);

async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const { course_id } = req.query as { course_id?: string };
  const user = req.context.user;

  if (("isAnonymous" in user && user.isAnonymous) || !user.id) {
    throw new UnauthorizedError();
  }

  if (!course_id) {
    throw new ValidationError({
      message: "O parâmetro course_id é obrigatório.",
      action: "Informe o ID do curso para listar os progressos.",
    });
  }

  const items = await ProgressModel.listByUserAndCourse(user.id, course_id);
  const summary = await ProgressModel.getCourseSummary(user.id, course_id);

  return res.status(200).json({
    summary,
    items,
  });
}

export default router.handler(controller.errorHandlers);
