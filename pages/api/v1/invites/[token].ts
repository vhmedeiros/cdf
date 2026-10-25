import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import { z } from "zod";
import controller from "@/infra/controller";
import { NotFoundError, ValidationError, CustomError } from "@/infra/errors";
import Invite from "@/models/invite";
import User from "@/models/user";
import Session from "@/models/session";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(controller.injectAnonymousOrUser);

// Classe de erro específica para convites já utilizados (HTTP 410 Gone)
class GoneError extends CustomError {
  constructor() {
    super({
      name: "GoneError",
      message: "Este convite já foi utilizado.",
      action: "Solicite um novo convite ao administrador.",
      statusCode: 410,
    });
  }
}

// GET /api/v1/invites/[token] — Visualiza os detalhes do convite
router.get(getHandler);

async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const { token } = req.query as { token: string };
  const invite = await findValidInvite(token);

  return res.status(200).json({
    email: invite.email,
    features: invite.features,
    expires_at: invite.expires_at,
  });
}

// PATCH /api/v1/invites/[token] — Aceita o convite e cria a conta
router.patch(patchHandler);

const AcceptInviteSchema = z.object({
  display_name: z.string().min(1, "Nome é obrigatório.").max(100),
  password: z
    .string()
    .min(8, "Senha deve ter no mínimo 8 caracteres.")
    .max(72, "Senha deve ter no máximo 72 caracteres."),
});

async function patchHandler(req: NextApiRequest, res: NextApiResponse) {
  const { token } = req.query as { token: string };
  const invite = await findValidInvite(token);

  const parsed = AcceptInviteSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError({ message: parsed.error.issues[0].message });
  }

  const { display_name, password } = parsed.data;

  // Cria o usuário com as features do convite
  const user = await User.create({
    email: invite.email,
    password,
    display_name,
    features: invite.features,
  });

  // Marca o convite como usado — impede uso duplo
  await Invite.markAsUsed(token);

  // Já loga o usuário criando uma sessão automaticamente
  const session = await Session.create(user.id);

  const isProduction = process.env.NODE_ENV === "production";
  res.setHeader(
    "Set-Cookie",
    [
      `session_id=${session.token}`,
      `HttpOnly`,
      `SameSite=Lax`,
      isProduction ? `Secure` : "",
      `Path=/`,
      `Expires=${session.expires_at.toUTCString()}`,
    ]
      .filter(Boolean)
      .join("; "),
  );

  return res.status(201).json(user);
}

// ─── Helper interno ─────────────────────────────────────────────────────────

async function findValidInvite(token: string) {
  const invite = await Invite.findByToken(token);

  if (!invite) {
    throw new NotFoundError({ message: "Convite não encontrado." });
  }

  if (invite.used_at) {
    throw new GoneError();
  }

  if (invite.expires_at < new Date()) {
    throw new NotFoundError({
      message: "Este convite expirou.",
      action: "Solicite um novo convite ao administrador.",
    });
  }

  return invite;
}

export default router.handler(controller.errorHandlers);
