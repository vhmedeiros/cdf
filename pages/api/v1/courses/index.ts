import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "@/infra/controller";
import { UnauthorizedError } from "@/infra/errors";
import CourseModel from "@/models/course";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(controller.injectAnonymousOrUser);

router.get(getHandler);

async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const user = req.context.user;

  if (("isAnonymous" in user && user.isAnonymous) || !user.id) {
    throw new UnauthorizedError();
  }

  const q = typeof req.query.q === "string" ? req.query.q.trim() : undefined;
  const categorySlug =
    typeof req.query.category === "string" && req.query.category.trim()
      ? req.query.category.trim()
      : undefined;

  const parsedLimit = Number.parseInt(String(req.query.limit ?? ""), 10);
  const parsedOffset = Number.parseInt(String(req.query.offset ?? ""), 10);
  const limit =
    Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 50) : undefined;
  const offset = Number.isFinite(parsedOffset) && parsedOffset > 0 ? parsedOffset : undefined;

  const filters = { q, categorySlug, limit, offset };

  const isAdmin = Boolean(
    user.features?.includes("read:course:all") ||
      user.features?.includes("create:course") ||
      user.features?.includes("create:invite"),
  );

  // Se for administrador, visualiza todos os cursos cadastrados
  if (isAdmin) {
    const courses = await CourseModel.findAll(filters);
    return res.status(200).json(courses);
  }

  const courses = await CourseModel.findEnrolledByUser(user.id, filters);
  return res.status(200).json(courses);
}

export default router.handler(controller.errorHandlers);
