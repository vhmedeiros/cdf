import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "@/infra/controller";
import { UnauthorizedError, ValidationError } from "@/infra/errors";
import ProgressModel, { updateProgressSchema } from "@/models/progress";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(controller.injectAnonymousOrUser);

router.put(putHandler);
router.get(getHandler);

async function putHandler(req: NextApiRequest, res: NextApiResponse) {
  const { materialId } = req.query as { materialId: string };
  const user = req.context.user;

  if (("isAnonymous" in user && user.isAnonymous) || !user.id) {
    throw new UnauthorizedError();
  }

  const parseResult = updateProgressSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw new ValidationError({
      message: "Dados de progresso inválidos.",
      action: parseResult.error.errors.map((e) => e.message).join(", "),
    });
  }

  const { position_seconds, watched_delta, completed } = parseResult.data;

  const progress = await ProgressModel.upsert(user.id, materialId, {
    positionSeconds: position_seconds,
    watchedDelta: watched_delta,
    completed,
  });

  return res.status(200).json(progress);
}

async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const { materialId } = req.query as { materialId: string };
  const user = req.context.user;

  if (("isAnonymous" in user && user.isAnonymous) || !user.id) {
    throw new UnauthorizedError();
  }

  const progress = await ProgressModel.findByUserAndMaterial(user.id, materialId);
  return res.status(200).json(
    progress || {
      material_id: materialId,
      user_id: user.id,
      position_seconds: 0,
      watched_seconds: 0,
      is_completed: false,
    },
  );
}

export default router.handler(controller.errorHandlers);
