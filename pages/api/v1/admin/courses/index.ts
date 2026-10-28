import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import { z } from "zod";
import controller from "@/infra/controller";
import { ValidationError } from "@/infra/errors";
import CourseModel, { LessonStrategy } from "@/models/course";
import EnrollmentModel from "@/models/enrollment";
import { extractFolderId } from "@/services/drive/client";

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
  lesson_strategy: z.enum(["auto", "folders", "files"]).default("auto"),
});

async function postHandler(req: NextApiRequest, res: NextApiResponse) {
  const parsed = CreateCourseSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError({ message: parsed.error.issues[0].message });
  }

  const { title, slug, drive_url, description, lesson_strategy } = parsed.data;

  const driveFolderId = extractFolderId(drive_url);
  if (!driveFolderId) {
    throw new ValidationError({
      message:
        "Não foi possível identificar o ID da pasta do Google Drive a partir do link fornecido.",
    });
  }

  const adminUser = req.context.user as any;

  const course = await CourseModel.create({
    title,
    slug,
    description: description || null,
    driveUrl: drive_url,
    driveFolderId,
    lessonStrategy: lesson_strategy as LessonStrategy,
    status: "published",
  });

  // Auto-matricula todos os usuários no novo curso publicado
  await EnrollmentModel.enrollAllUsersInCourse(course.id, adminUser?.id);

  return res.status(201).json(course);
}

export default router.handler(controller.errorHandlers);
