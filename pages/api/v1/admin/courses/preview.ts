import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import { z } from "zod";
import controller from "@/infra/controller";
import { ValidationError } from "@/infra/errors";
import { LessonStrategy } from "@/models/course";
import { buildTree } from "@/services/drive/buildTree";
import { extractFolderId, fetchDriveFolderItems } from "@/services/drive/client";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(controller.injectAnonymousOrUser);

router.post(controller.canRequest("create:course"), postHandler);

const PreviewSchema = z.object({
  drive_url: z.string().min(1, "Link do Google Drive é obrigatório."),
  lesson_strategy: z.enum(["auto", "folders", "files"]).default("auto"),
});

async function postHandler(req: NextApiRequest, res: NextApiResponse) {
  const parsed = PreviewSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError({ message: parsed.error.issues[0].message });
  }

  const { drive_url, lesson_strategy } = parsed.data;

  const folderId = extractFolderId(drive_url);
  if (!folderId) {
    throw new ValidationError({
      message: "Não foi possível identificar o ID da pasta do Google Drive a partir do link.",
      action:
        "Certifique-se de colar um link válido do Google Drive (ex: https://drive.google.com/drive/folders/...)",
    });
  }

  try {
    const items = await fetchDriveFolderItems(folderId);
    if (!items || items.length === 0) {
      return res.status(200).json({
        folder_id: folderId,
        strategy: lesson_strategy,
        total_duration_seconds: 0,
        materials_count: 0,
        modules_count: 0,
        modules: [],
        warning:
          "Nenhum arquivo encontrado nesta pasta ou a pasta não está compartilhada com o Service Account.",
      });
    }

    const tree = buildTree(items, {
      rootFolderId: folderId,
      strategy: lesson_strategy as LessonStrategy,
    });

    return res.status(200).json({
      folder_id: folderId,
      strategy: lesson_strategy,
      total_duration_seconds: tree.totalDurationSeconds,
      materials_count: tree.materialsCount,
      modules_count: tree.modules.length,
      modules: tree.modules.map((m) => ({
        title: m.title,
        lessons_count: m.lessons.length,
        lessons: m.lessons.map((l) => ({
          title: l.title,
          materials_count: l.materials.length,
          materials: l.materials.map((mat) => ({
            title: mat.title,
            kind: mat.kind,
            duration_seconds: mat.durationSeconds,
          })),
        })),
      })),
    });
  } catch (err: any) {
    throw new ValidationError({
      message: `Erro ao acessar o Google Drive: ${err.message}`,
      action: "Verifique se a pasta foi compartilhada com a Service Account do Google Cloud.",
    });
  }
}

export default router.handler(controller.errorHandlers);
