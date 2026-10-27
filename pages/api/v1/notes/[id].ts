import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "@/infra/controller";
import { NotFoundError, UnauthorizedError, ValidationError } from "@/infra/errors";
import NoteModel, { updateNoteSchema } from "@/models/note";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(controller.injectAnonymousOrUser);

router.get(getHandler);
router.patch(patchHandler);
router.delete(deleteHandler);

async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };
  const user = req.context.user;

  if (("isAnonymous" in user && user.isAnonymous) || !user.id) {
    throw new UnauthorizedError();
  }

  const note = await NoteModel.findById(user.id, id);
  if (!note) {
    throw new NotFoundError({ message: "Anotação não encontrada." });
  }

  return res.status(200).json(note);
}

async function patchHandler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };
  const user = req.context.user;

  if (("isAnonymous" in user && user.isAnonymous) || !user.id) {
    throw new UnauthorizedError();
  }

  const parseResult = updateNoteSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw new ValidationError({
      message: "Dados de atualização da anotação inválidos.",
      action: parseResult.error.errors.map((e) => e.message).join(", "),
    });
  }

  const { body, timestamp_seconds, is_important } = parseResult.data;

  const updated = await NoteModel.update(user.id, id, {
    body,
    timestampSeconds: timestamp_seconds,
    isImportant: is_important,
  });

  return res.status(200).json(updated);
}

async function deleteHandler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };
  const user = req.context.user;

  if (("isAnonymous" in user && user.isAnonymous) || !user.id) {
    throw new UnauthorizedError();
  }

  await NoteModel.delete(user.id, id);
  return res.status(200).json({ success: true });
}

export default router.handler(controller.errorHandlers);
