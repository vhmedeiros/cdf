import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "@/infra/controller";
import { NotFoundError } from "@/infra/errors";
import CourseModel from "@/models/course";
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

  const enrolledCount = await EnrollmentModel.enrollAllUsersInCourse(id, adminUser?.id);

  return res.status(200).json({
    course_id: id,
    enrolled_count: enrolledCount,
    message: `${enrolledCount} aluno(s) matriculado(s) com sucesso neste curso!`,
  });
}

export default router.handler(controller.errorHandlers);
