import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "@/infra/controller";
import { UnauthorizedError, ValidationError } from "@/infra/errors";
import NoteModel, { createNoteSchema, listNotesQuerySchema } from "@/models/note";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(controller.injectAnonymousOrUser);

router.get(getHandler);
router.post(postHandler);

async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const user = req.context.user;

  if (("isAnonymous" in user && user.isAnonymous) || !user.id) {
    throw new UnauthorizedError();
  }

  const queryParse = listNotesQuerySchema.safeParse(req.query);
  if (!queryParse.success) {
    throw new ValidationError({
      message: "Parâmetros de busca de anotações inválidos.",
      action: queryParse.error.errors.map((e) => e.message).join(", "),
    });
  }

  const { course_id, material_id, important, q } = queryParse.data;

  const notes = await NoteModel.list(user.id, {
    courseId: course_id,
    materialId: material_id,
    isImportant: important,
    q,
  });

  return res.status(200).json(notes);
}

async function postHandler(req: NextApiRequest, res: NextApiResponse) {
  const user = req.context.user;

  if (("isAnonymous" in user && user.isAnonymous) || !user.id) {
    throw new UnauthorizedError();
  }

  const parseResult = createNoteSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw new ValidationError({
      message: "Dados da anotação inválidos.",
      action: parseResult.error.errors.map((e) => e.message).join(", "),
    });
  }

  const { material_id, timestamp_seconds, body, is_important } = parseResult.data;

  const note = await NoteModel.create(user.id, {
    materialId: material_id,
    timestampSeconds: timestamp_seconds,
    body,
    isImportant: is_important,
  });

  return res.status(201).json(note);
}

export default router.handler(controller.errorHandlers);
