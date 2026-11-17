import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import { z } from "zod";
import controller from "@/infra/controller";
import { ValidationError } from "@/infra/errors";
import CourseModel, { LessonStrategy } from "@/models/course";
import {
  extractFolderId,
  getDriveFileMetadata,
  GOOGLE_DRIVE_FOLDER_MIME,
} from "@/services/drive/client";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(controller.injectAnonymousOrUser);

router.get(controller.canRequest("create:course"), getHandler);
router.post(controller.canRequest("create:course"), postHandler);

async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const courses = await CourseModel.findAll();
  const coursesWithCounts = await Promise.all(
    courses.map(async (c) => ({
      ...c,
      enrollments_count: await CourseModel.getEnrollmentsCount(c.id),
    })),
  );
  return res.status(200).json(coursesWithCounts);
}

const CreateCourseSchema = z.object({
  title: z.string().min(1, "Título é obrigatório.").max(200),
  slug: z
    .string()
    .min(1, "Slug é obrigatório.")
    .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens."),
  drive_url: z.string().min(1, "Link do Google Drive é obrigatório."),
  description: z.string().optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  lesson_strategy: z.enum(["auto", "folders", "files"]).default("auto"),
});

async function postHandler(req: NextApiRequest, res: NextApiResponse) {
  const parsed = CreateCourseSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError({ message: parsed.error.issues[0].message });
  }

  const { title, slug, drive_url, description, category_id, lesson_strategy } = parsed.data;

  const driveFolderId = extractFolderId(drive_url);
  if (!driveFolderId) {
    throw new ValidationError({
      message: "O link informado não é de uma pasta do Google Drive.",
      action:
        "Cole um link de pasta (ex: https://drive.google.com/drive/folders/...) ou o ID da pasta. Links de arquivo (/file/d/...) não criam curso.",
    });
  }

  const metadata = await getDriveFileMetadata(driveFolderId);
  if (metadata && metadata.mimeType !== GOOGLE_DRIVE_FOLDER_MIME) {
    throw new ValidationError({
      message: "O link informado aponta para um arquivo, não para uma pasta.",
      action: "Abra a pasta no Google Drive e copie o link de compartilhamento dela.",
    });
  }

  const course = await CourseModel.create({
    title,
    slug,
    description: description || null,
    categoryId: category_id || null,
    driveUrl: drive_url,
    driveFolderId,
    lessonStrategy: lesson_strategy as LessonStrategy,
    status: "draft",
  });

  return res.status(201).json({
    ...course,
    message:
      "Curso criado como rascunho. Sincronize para importar as aulas e depois publique para os alunos.",
  });
}

export default router.handler(controller.errorHandlers);
