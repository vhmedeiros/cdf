import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "@/infra/controller";
import { NotFoundError, ValidationError } from "@/infra/errors";
import CourseModel from "@/models/course";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(controller.injectAnonymousOrUser);
router.delete(controller.canRequest("create:course"), deleteHandler);

async function deleteHandler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };
  if (!id || typeof id !== "string") {
    throw new ValidationError({ message: "ID do curso inválido." });
  }

  const course = await CourseModel.findById(id);
  if (!course) {
    throw new NotFoundError({ message: "Curso não encontrado." });
  }

  await CourseModel.deleteCourse(id);

  return res.status(200).json({
    success: true,
    message: `Curso "${course.title}" excluído com sucesso.`,
  });
}

export default router.handler(controller.errorHandlers);
