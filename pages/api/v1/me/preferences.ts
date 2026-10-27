import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "@/infra/controller";
import { UnauthorizedError, ValidationError } from "@/infra/errors";
import PreferenceModel, { updatePreferencesSchema } from "@/models/preference";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(controller.injectAnonymousOrUser);

router.get(getHandler);
router.patch(patchHandler);

async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const user = req.context.user;

  if (("isAnonymous" in user && user.isAnonymous) || !user.id) {
    throw new UnauthorizedError();
  }

  const preferences = await PreferenceModel.findByUserId(user.id);
  return res.status(200).json(preferences);
}

async function patchHandler(req: NextApiRequest, res: NextApiResponse) {
  const user = req.context.user;

  if (("isAnonymous" in user && user.isAnonymous) || !user.id) {
    throw new UnauthorizedError();
  }

  const parseResult = updatePreferencesSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw new ValidationError({
      message: "Preferências inválidas.",
      action: parseResult.error.errors.map((e) => e.message).join(", "),
    });
  }

  const updated = await PreferenceModel.upsert(user.id, parseResult.data);
  return res.status(200).json(updated);
}

export default router.handler(controller.errorHandlers);
