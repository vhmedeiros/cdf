import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "@/infra/controller";
import database from "@/infra/database";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "@/infra/errors";
import EnrollmentModel from "@/models/enrollment";
import NoteModel from "@/models/note";
import ProgressModel from "@/models/progress";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(controller.injectAnonymousOrUser);

router.get(getHandler);

async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };
  const user = req.context.user;

  if (("isAnonymous" in user && user.isAnonymous) || !user.id) {
    throw new UnauthorizedError();
  }

  // 1. Busca metadados do material, aula, módulo e curso
  const matRes = await database.query(
    `SELECT m.*, l.title as lesson_title, mod.title as module_title, mod.course_id
     FROM materials m
     INNER JOIN lessons l ON l.id = m.lesson_id
     INNER JOIN modules mod ON mod.id = l.module_id
     WHERE m.id = $1 AND m.is_active = true
     LIMIT 1`,
    [id],
  );

  const material = matRes.rows[0];
  if (!material) {
    throw new NotFoundError({ message: "Material não encontrado." });
  }

  // 2. Autorização: admin ou matriculado no curso
  const isAdmin = user.features?.includes("read:course:all");
  const isEnrolled = await EnrollmentModel.isEnrolled(user.id, material.course_id);

  if (!isAdmin && !isEnrolled) {
    throw new ForbiddenError({
      message: "Você não tem acesso a este material.",
    });
  }

  // 3. Progresso do usuário no material
  const progress = await ProgressModel.findByUserAndMaterial(user.id, id);

  // 4. Notas do usuário no material
  const notes = await NoteModel.list(user.id, { materialId: id });

  return res.status(200).json({
    material: {
      id: material.id,
      title: material.title,
      kind: material.kind,
      mime: material.mime,
      size_bytes: material.size_bytes,
      duration_seconds: material.duration_seconds,
      lesson_id: material.lesson_id,
      lesson_title: material.lesson_title,
      module_title: material.module_title,
      course_id: material.course_id,
    },
    progress: progress || {
      material_id: id,
      user_id: user.id,
      position_seconds: 0,
      watched_seconds: 0,
      is_completed: false,
    },
    notes,
  });
}

export default router.handler(controller.errorHandlers);
