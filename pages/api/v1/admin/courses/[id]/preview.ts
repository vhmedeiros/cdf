import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "@/infra/controller";
import { NotFoundError } from "@/infra/errors";
import CourseModel from "@/models/course";
import { buildTree } from "@/services/drive/buildTree";
import { fetchDriveFolderItems } from "@/services/drive/client";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(controller.injectAnonymousOrUser);

router.post(controller.canRequest("create:course"), postHandler);

async function postHandler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };

  const course = await CourseModel.findById(id);
  if (!course) {
    throw new NotFoundError({ message: "Curso não encontrado." });
  }

  // Busca itens do Drive e monta a árvore em memória (sem salvar no banco)
  const items = await fetchDriveFolderItems(course.drive_folder_id);
  const preview = buildTree(items, {
    rootFolderId: course.drive_folder_id,
    strategy: course.lesson_strategy,
  });

  return res.status(200).json({
    course_id: course.id,
    title: course.title,
    strategy_used: course.lesson_strategy,
    total_duration_seconds: preview.totalDurationSeconds,
    materials_count: preview.materialsCount,
    modules: preview.modules,
  });
}

export default router.handler(controller.errorHandlers);
