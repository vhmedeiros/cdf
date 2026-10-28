import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "@/infra/controller";
import database from "@/infra/database";
import { NotFoundError, ValidationError } from "@/infra/errors";
import CourseModel from "@/models/course";
import EnrollmentModel from "@/models/enrollment";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(controller.injectAnonymousOrUser);
router.get(controller.canRequest("create:course"), getHandler);
router.post(controller.canRequest("create:course"), postHandler);

// GET: Retorna todos os alunos do sistema com o status de matrícula neste curso
async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };

  const course = await CourseModel.findById(id);
  if (!course) {
    throw new NotFoundError({ message: "Curso não encontrado." });
  }

  const queryResult = await database.query(
    `SELECT 
       u.id,
       u.email,
       u.display_name,
       u.created_at,
       (e.id IS NOT NULL AND (e.expires_at IS NULL OR e.expires_at > now())) as is_enrolled,
       e.created_at as enrolled_at
     FROM users u
     LEFT JOIN enrollments e ON e.user_id = u.id AND e.course_id = $1
     ORDER BY u.display_name ASC, u.email ASC`,
    [id],
  );

  return res.status(200).json(queryResult.rows);
}

// POST: Modifica a matrícula de um ou mais alunos no curso
async function postHandler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };
  const adminUser = req.context.user as any;

  const course = await CourseModel.findById(id);
  if (!course) {
    throw new NotFoundError({ message: "Curso não encontrado." });
  }

  const { user_id, user_ids, enrolled } = req.body;

  if (typeof enrolled !== "boolean") {
    throw new ValidationError({ message: "O campo 'enrolled' (boolean) é obrigatório." });
  }

  const targetIds: string[] = [];
  if (user_id) targetIds.push(user_id);
  if (Array.isArray(user_ids)) targetIds.push(...user_ids);

  if (targetIds.length === 0) {
    throw new ValidationError({ message: "Nenhum aluno especificado (user_id ou user_ids)." });
  }

  for (const uid of targetIds) {
    if (enrolled) {
      await EnrollmentModel.create({
        userId: uid,
        courseId: id,
        grantedBy: adminUser?.id,
      });
    } else {
      await EnrollmentModel.remove(uid, id);
    }
  }

  return res.status(200).json({
    course_id: id,
    affected_count: targetIds.length,
    enrolled,
    message: enrolled
      ? `Acesso concedido para ${targetIds.length} aluno(s).`
      : `Acesso removido para ${targetIds.length} aluno(s).`,
  });
}

export default router.handler(controller.errorHandlers);
