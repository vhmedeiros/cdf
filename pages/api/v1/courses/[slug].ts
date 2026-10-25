import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "@/infra/controller";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "@/infra/errors";
import CourseModel from "@/models/course";
import EnrollmentModel from "@/models/enrollment";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(controller.injectAnonymousOrUser);

router.get(getHandler);

async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const { slug } = req.query as { slug: string };
  const user = req.context.user;

  if ("isAnonymous" in user && user.isAnonymous) {
    throw new UnauthorizedError();
  }

  const course = await CourseModel.findBySlug(slug);
  if (!course) {
    throw new NotFoundError({ message: "Curso não encontrado." });
  }

  // Verifica se o usuário tem matrícula ativa no curso
  // Admins com "read:course:all" também podem acessar
  const isAdmin = user.features.includes("read:course:all");
  const isEnrolled = await EnrollmentModel.isEnrolled(user.id, course.id);

  if (!isAdmin && !isEnrolled) {
    throw new ForbiddenError({
      message: "Você não tem matrícula ativa neste curso.",
      action: "Entre em contato com o suporte ou administrador para obter acesso.",
    });
  }

  const tree = await CourseModel.getTree(course.id);
  return res.status(200).json(tree);
}

export default router.handler(controller.errorHandlers);
