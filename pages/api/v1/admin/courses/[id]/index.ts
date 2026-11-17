import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import { z } from "zod";
import controller from "@/infra/controller";
import { NotFoundError, ValidationError } from "@/infra/errors";
import CourseModel from "@/models/course";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(controller.injectAnonymousOrUser);
router.patch(controller.canRequest("create:course"), patchHandler);
router.delete(controller.canRequest("create:course"), deleteHandler);

const UpdateCourseSchema = z
  .object({
    title: z.string().min(1, "Título é obrigatório.").max(200).optional(),
    description: z.string().nullable().optional(),
    category_id: z.string().uuid().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Nenhum campo informado para atualização.",
  });

function getCourseId(req: NextApiRequest): string {
  const { id } = req.query as { id: string };
  if (!id || typeof id !== "string") {
    throw new ValidationError({ message: "ID do curso inválido." });
  }
  return id;
}

async function patchHandler(req: NextApiRequest, res: NextApiResponse) {
  const id = getCourseId(req);
  const course = await CourseModel.findById(id);
  if (!course) {
    throw new NotFoundError({ message: "Curso não encontrado." });
  }

  const parsed = UpdateCourseSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError({ message: parsed.error.issues[0].message });
  }

  const updated = await CourseModel.update(id, {
    title: parsed.data.title,
    description: parsed.data.description,
    categoryId: parsed.data.category_id,
  });

  return res.status(200).json(updated);
}

async function deleteHandler(req: NextApiRequest, res: NextApiResponse) {
  const id = getCourseId(req);

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
