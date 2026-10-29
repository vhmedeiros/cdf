import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "@/infra/controller";
import { UnauthorizedError, ForbiddenError } from "@/infra/errors";
import QuestionModel, { QuestionFormat, QuestionOrigin, QuestionStatus } from "@/models/question";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(controller.injectAnonymousOrUser);
router.get(getHandler);
router.post(postHandler);

async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const user = req.context.user;
  const isUserAuthenticated = !("isAnonymous" in user && user.isAnonymous);

  const {
    course_id,
    subject_id,
    topic_id,
    board_id,
    organ,
    year,
    format,
    status = "published",
    origin,
    only_unanswered,
    limit = "20",
    offset = "0",
  } = req.query;

  const result = await QuestionModel.list({
    course_id: typeof course_id === "string" ? course_id : undefined,
    subject_id: typeof subject_id === "string" ? subject_id : undefined,
    topic_id: typeof topic_id === "string" ? topic_id : undefined,
    board_id: typeof board_id === "string" ? board_id : undefined,
    organ: typeof organ === "string" ? organ : undefined,
    year: typeof year === "string" ? parseInt(year, 10) : undefined,
    format: typeof format === "string" ? (format as QuestionFormat) : undefined,
    status: typeof status === "string" ? (status as QuestionStatus) : "published",
    origin: typeof origin === "string" ? (origin as QuestionOrigin) : undefined,
    userId: isUserAuthenticated ? user.id : undefined,
    only_unanswered: only_unanswered === "true",
    limit: Math.min(Math.max(parseInt(limit as string, 10) || 20, 1), 100),
    offset: Math.max(parseInt(offset as string, 10) || 0, 0),
  });

  return res.status(200).json(result);
}

async function postHandler(req: NextApiRequest, res: NextApiResponse) {
  const user = req.context.user;

  if (("isAnonymous" in user && user.isAnonymous) || !user.id) {
    throw new UnauthorizedError();
  }

  const isAdmin = Boolean(
    user.features?.includes("create:course") ||
      user.features?.includes("create:invite") ||
      user.features?.includes("read:course:all"),
  );

  if (!isAdmin) {
    throw new ForbiddenError({ message: "Apenas administradores podem cadastrar questões." });
  }

  const created = await QuestionModel.create(req.body);
  return res.status(201).json(created);
}

export default router.handler(controller.errorHandlers);
