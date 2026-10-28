import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "@/infra/controller";
import { NotFoundError } from "@/infra/errors";
import CourseModel, { CourseStatus } from "@/models/course";
import EnrollmentModel from "@/models/enrollment";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(controller.injectAnonymousOrUser);
router.post(controller.canRequest("create:course"), postHandler);

async function postHandler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };
  const adminUser = req.context.user as any;

  const course = await CourseModel.findById(id);
  if (!course) {
    throw new NotFoundError({ message: "Curso não encontrado." });
  }

  // Alterna entre published e draft
  const newStatus: CourseStatus = course.status === "published" ? "draft" : "published";
  const updatedCourse = await CourseModel.updateStatus(id, newStatus);

  // Se passou a ser publicado, garante que todos os alunos existentes sejam matriculados
  if (newStatus === "published") {
    await EnrollmentModel.enrollAllUsersInCourse(id, adminUser?.id);
  }

  return res.status(200).json({
    course: updatedCourse,
    message:
      newStatus === "published"
        ? "Curso publicado e liberado para os alunos com sucesso!"
        : "Curso alterado para rascunho (oculto para alunos).",
  });
}

export default router.handler(controller.errorHandlers);
