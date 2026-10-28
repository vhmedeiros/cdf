import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import { z } from "zod";
import controller from "@/infra/controller";
import { ValidationError } from "@/infra/errors";
import Invite from "@/models/invite";
import User from "@/models/user";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(controller.injectAnonymousOrUser);

// GET /api/v1/admin/invites — Admin lista todos os convites
router.get(controller.canRequest("create:invite"), getHandler);

// POST /api/v1/admin/invites — Admin cria um convite
// Requer a feature "create:invite"
router.post(controller.canRequest("create:invite"), postHandler);

async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const invites = await Invite.findAll();
  return res.status(200).json(invites);
}

const CreateInviteSchema = z.object({
  email: z.string().email("E-mail inválido."),
  features: z.array(z.string()).default(["read:course", "create:note", "create:answer"]),
});

async function postHandler(req: NextApiRequest, res: NextApiResponse) {
  const parsed = CreateInviteSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError({ message: parsed.error.issues[0].message });
  }

  const { email, features } = parsed.data;
  const user = req.context.user as Awaited<ReturnType<typeof User.findById>>;

  const invite = await Invite.create({
    email,
    features,
    createdBy: user!.id,
  });

  // Em produção, aqui enviaria o e-mail com o link do convite.
  // Por ora, retornamos o token diretamente para facilitar o desenvolvimento/testes.
  return res.status(201).json({
    id: invite.id,
    email: invite.email,
    token: invite.token,
    features: invite.features,
    expires_at: invite.expires_at,
  });
}

export default router.handler(controller.errorHandlers);
