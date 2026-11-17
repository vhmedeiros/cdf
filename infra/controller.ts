import { NextApiRequest, NextApiResponse } from "next";
import { parse as parseCookies } from "cookie";
import { CustomError, InternalServerError, UnauthorizedError, ForbiddenError } from "./errors";
import Session from "@/models/session";
import User, { anonymousUser, AnyUser } from "@/models/user";

// Extende o tipo padrão do Next.js para adicionar nosso contexto.
// Assim o TypeScript sabe que req.context existe em qualquer handler.
declare module "next" {
  interface NextApiRequest {
    context: {
      user: AnyUser;
    };
  }
}

// ─── Verificação de Origin/CSRF ──────────────────────────────────────────────

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function parseOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

// Valida Origin/Referer apenas em métodos mutantes e apenas quando o header
// está presente. Clientes não-browser (testes, jobs internos) normalmente não
// enviam Origin; nesses casos o SameSite=Lax continua sendo a proteção padrão.
function isRequestOriginAllowed(req: NextApiRequest): boolean {
  if (!MUTATING_METHODS.has((req.method || "GET").toUpperCase())) {
    return true;
  }

  const allowedOrigin = parseOrigin(process.env.WEBSERVER_ORIGIN);
  if (!allowedOrigin) {
    return true;
  }

  const rawHeader = req.headers.origin ?? req.headers.referer;
  const headerValue = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
  if (!headerValue) {
    return true;
  }

  const requestOrigin = parseOrigin(headerValue);
  return requestOrigin === allowedOrigin;
}

// ─── Middlewares ────────────────────────────────────────────────────────────

// injectAnonymousOrUser: lê o cookie session_id, busca a sessão no banco
// e injeta o usuário (ou o anônimo) em req.context.user.
//
// Analogia Django: SessionMiddleware + AuthenticationMiddleware que popula
// request.user automaticamente em cada requisição.
export async function injectAnonymousOrUser(
  req: NextApiRequest,
  res: NextApiResponse,
  next: () => void | Promise<void>,
) {
  if (!isRequestOriginAllowed(req)) {
    throw new ForbiddenError({
      message: "Origem da requisição não autorizada.",
      action: "Envie a requisição a partir do domínio oficial da plataforma.",
    });
  }

  const cookies = parseCookies(req.headers.cookie || "");
  const token = cookies.session_id;

  if (!token) {
    req.context = { user: anonymousUser };
    return next();
  }

  const session = await Session.findByToken(token);

  if (!session) {
    req.context = { user: anonymousUser };
    return next();
  }

  const user = await User.findById(session.user_id);

  if (!user) {
    req.context = { user: anonymousUser };
    return next();
  }

  // Renova o prazo de expiração (sliding session — a sessão dura 30 dias
  // a partir do ÚLTIMO uso, não da criação)
  await Session.renewByToken(token);

  req.context = { user };
  return next();
}

// canRequest: verifica se o usuário tem a feature necessária.
// Retorna um middleware pronto para ser encadeado no router.
//
// Analogia Django: @permission_required('app.minha_permissao')
// Uso: router.post(canRequest("create:invite"), handler)
export function canRequest(feature: string) {
  return async function (
    req: NextApiRequest,
    res: NextApiResponse,
    next: () => void | Promise<void>,
  ) {
    if (!req.context?.user) {
      throw new InternalServerError({
        cause: "canRequest usado sem injectAnonymousOrUser antes.",
      });
    }

    const user = req.context.user;

    if ("isAnonymous" in user && user.isAnonymous) {
      throw new UnauthorizedError();
    }

    if (!user.features.includes(feature)) {
      throw new ForbiddenError();
    }

    return next();
  };
}

// ─── Tratamento de erros ────────────────────────────────────────────────────

function onErrorHandler(error: unknown, _req: NextApiRequest, res: NextApiResponse) {
  if (error instanceof CustomError) {
    return res.status(error.statusCode).json(error.toJSON());
  }

  console.error("Unhandled Error in API controller:", error);
  const publicError = new InternalServerError({ cause: error });
  return res.status(publicError.statusCode).json(publicError.toJSON());
}

function onNoMatchHandler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(405).json({
    name: "MethodNotAllowedError",
    message: "Método HTTP não permitido para este endpoint.",
    action: "Verifique o método HTTP utilizado.",
    status_code: 405,
  });
}

const controller = {
  errorHandlers: {
    onError: onErrorHandler,
    onNoMatch: onNoMatchHandler,
  },
  injectAnonymousOrUser,
  canRequest,
};

export default controller;
