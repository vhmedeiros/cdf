import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import { z } from "zod";
import controller from "@/infra/controller";
import { ValidationError } from "@/infra/errors";
import EnrollmentModel from "@/models/enrollment";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(controller.injectAnonymousOrUser);

router.post(controller.canRequest("create:course"), postHandler);
router.delete(controller.canRequest("create:course"), deleteHandler);

const CreateEnrollmentSchema = z.object({
  user_id: z.string().uuid("ID de usuário inválido."),
  course_id: z.string().uuid("ID de curso inválido."),
  expires_at: z.string().datetime().optional().nullable(),
});

async function postHandler(req: NextApiRequest, res: NextApiResponse) {
  const parsed = CreateEnrollmentSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError({ message: parsed.error.issues[0].message });
  }

  const { user_id, course_id, expires_at } = parsed.data;
  const adminUser = req.context.user as any;

  const enrollment = await EnrollmentModel.create({
    userId: user_id,
    courseId: course_id,
    grantedBy: adminUser.id,
    expiresAt: expires_at ? new Date(expires_at) : null,
  });

  return res.status(201).json(enrollment);
}

const DeleteEnrollmentSchema = z.object({
  user_id: z.string().uuid("ID de usuário inválido."),
  course_id: z.string().uuid("ID de curso inválido."),
});

async function deleteHandler(req: NextApiRequest, res: NextApiResponse) {
  const parsed = DeleteEnrollmentSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError({ message: parsed.error.issues[0].message });
  }

  const { user_id, course_id } = parsed.data;
  await EnrollmentModel.remove(user_id, course_id);

  return res.status(200).json({ message: "Matrícula removida com sucesso." });
}

export default router.handler(controller.errorHandlers);
