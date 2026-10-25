import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import { z } from "zod";
import controller from "@/infra/controller";
import { ValidationError } from "@/infra/errors";
import { checkRateLimit, resetRateLimit } from "@/infra/rate-limit";
import User from "@/models/user";
import Session from "@/models/session";

const router = createRouter<NextApiRequest, NextApiResponse>();

// Middleware de injeção de sessão em todas as rotas deste arquivo
router.use(controller.injectAnonymousOrUser);

// ─── POST /api/v1/sessions — Login ──────────────────────────────────────────
router.post(postHandler);

// Schema zod: define o que esperamos no body da requisição
const LoginSchema = z.object({
  email: z.string().email("E-mail inválido."),
  password: z.string().min(1, "Senha é obrigatória."),
});

async function postHandler(req: NextApiRequest, res: NextApiResponse) {
  // 1. Validação da entrada com zod
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError({ message: parsed.error.issues[0].message });
  }

  const { email, password } = parsed.data;

  // 2. Rate-limit por IP e por email
  //    Bloqueamos separadamente por IP e por email para cobrir os dois vetores:
  //    - Por IP: atacante testa muitos emails com o mesmo IP
  //    - Por email: atacante usa muitos IPs para atacar uma conta específica
  const ip = req.headers["x-forwarded-for"] ?? req.socket?.remoteAddress ?? "unknown";
  const rateLimitKey = `login:${String(ip)}:${email}`;

  await checkRateLimit({ key: rateLimitKey, maxAttempts: 5 });

  // 3. Autenticação (verifica email + senha)
  //    User.authenticate() lança NotFoundError (401) se as credenciais forem inválidas
  const user = await User.authenticate(email, password);

  // 4. Login bem-sucedido: reseta o contador de tentativas
  await resetRateLimit(rateLimitKey);

  // 5. Cria a sessão no banco
  const session = await Session.create(user.id);

  // 6. Envia o token como cookie HttpOnly
  //    HttpOnly: JavaScript da página NÃO consegue ler o cookie (proteção XSS)
  //    SameSite=Lax: proteção básica contra CSRF
  //    Secure: só envia por HTTPS (em produção)
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

  // 7. Responde com os dados públicos do usuário (sem senha!)
  return res.status(201).json(user);
}

// ─── DELETE /api/v1/sessions — Logout ──────────────────────────────────────
router.delete(deleteHandler);

async function deleteHandler(req: NextApiRequest, res: NextApiResponse) {
  const { parse: parseCookies } = await import("cookie");
  const cookies = parseCookies(req.headers.cookie || "");
  const token = cookies.session_id;

  if (token) {
    // Deleta a sessão do banco — invalida o token imediatamente
    await Session.deleteByToken(token);
  }

  // Remove o cookie no navegador setando uma data de expiração no passado
  res.setHeader(
    "Set-Cookie",
    "session_id=; HttpOnly; SameSite=Lax; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  );

  return res.status(200).json({ message: "Logout realizado com sucesso." });
}

export default router.handler(controller.errorHandlers);
