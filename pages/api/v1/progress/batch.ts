import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "@/infra/controller";
import { UnauthorizedError, ValidationError } from "@/infra/errors";
import ProgressModel, { batchProgressSchema } from "@/models/progress";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(controller.injectAnonymousOrUser);

router.post(postHandler);

async function postHandler(req: NextApiRequest, res: NextApiResponse) {
  const user = req.context.user;

  if (("isAnonymous" in user && user.isAnonymous) || !user.id) {
    throw new UnauthorizedError();
  }

  // sendBeacon envia como text/plain às vezes, trata se for string JSON
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      // Ignora erro de parse e deixa o zod validar
    }
  }

  const parseResult = batchProgressSchema.safeParse(body);
  if (!parseResult.success) {
    throw new ValidationError({
      message: "Dados de lote de progresso inválidos.",
      action: parseResult.error.errors.map((e) => e.message).join(", "),
    });
  }

  const results = [];
  for (const item of parseResult.data.items) {
    const prog = await ProgressModel.upsert(user.id, item.material_id, {
      positionSeconds: item.position_seconds,
      watchedDelta: item.watched_delta,
      completed: item.completed,
    });
    results.push(prog);
  }

  return res.status(200).json({ processed: results.length, items: results });
}

export default router.handler(controller.errorHandlers);
