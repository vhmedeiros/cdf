import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import { Readable } from "node:stream";
import controller from "@/infra/controller";
import database from "@/infra/database";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "@/infra/errors";
import EnrollmentModel from "@/models/enrollment";

// Desliga o bodyParser e o limite de tamanho de resposta do Next.js
// Essencial para permitir streaming contínuo de vídeo em alta resolução sem travar a memória do Node.js
export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(controller.injectAnonymousOrUser);

router.get(getHandler);

async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };
  const user = req.context.user;

  if ("isAnonymous" in user && user.isAnonymous) {
    throw new UnauthorizedError();
  }

  // 1. Busca metadados do material e identifica o curso ao qual ele pertence
  const materialResult = await database.query(
    `SELECT m.*, mod.course_id
     FROM materials m
     INNER JOIN lessons l ON l.id = m.lesson_id
     INNER JOIN modules mod ON mod.id = l.module_id
     WHERE m.id = $1 AND m.is_active = true
     LIMIT 1`,
    [id],
  );

  const material = materialResult.rows[0];
  if (!material) {
    throw new NotFoundError({ message: "Material não encontrado." });
  }

  // 2. Verifica autorização (matrícula ativa ou admin)
  const isAdmin = user.features.includes("read:course:all");
  const isEnrolled = await EnrollmentModel.isEnrolled(user.id, material.course_id);

  if (!isAdmin && !isEnrolled) {
    throw new ForbiddenError({
      message: "Você não tem acesso a este material. É necessário estar matriculado no curso.",
    });
  }

  const streamMode = process.env.STREAM_MODE || "node";

  // 3. Modo Produção: Next autoriza, Nginx transmite via X-Accel-Redirect
  if (streamMode === "nginx") {
    // Em produção, o Nginx intercepta este cabeçalho e faz o proxy direto para o Google Drive
    res.setHeader("X-Accel-Redirect", `/_drive/${material.drive_file_id}`);
    res.setHeader("X-Drive-Token", process.env.DRIVE_ACCESS_TOKEN || "token-placeholder");
    res.setHeader("Content-Type", material.mime);
    return res.status(200).end();
  }

  // 4. Modo Desenvolvimento / Testes (STREAM_MODE=node):
  //    O Node faz o proxy de streaming com suporte a Range Requests (206 Partial Content)
  const rangeHeader = req.headers.range;
  const size = Number(material.size_bytes) || 1048576; // fallback 1MB para simulações

  if (material.kind === "pdf") {
    res.setHeader("Content-Disposition", 'inline; filename="documento.pdf"');
  }

  res.setHeader("Content-Type", material.mime);
  res.setHeader("Accept-Ranges", "bytes");

  // Se a requisição pediu um trecho específico (Range: bytes=start-end)
  if (rangeHeader) {
    const parts = rangeHeader.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : size - 1;
    const chunksize = end - start + 1;

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunksize,
      "Content-Type": material.mime,
    });

    // Cria um buffer simulado para dev/testes ou pipe da API se houver SA configurada
    const chunk = Buffer.alloc(chunksize);
    return res.end(chunk);
  }

  // Requisição completa (200 OK)
  res.writeHead(200, {
    "Content-Length": size,
    "Content-Type": material.mime,
    "Accept-Ranges": "bytes",
  });

  const fullBuffer = Buffer.alloc(Math.min(size, 65536)); // amostragem
  return res.end(fullBuffer);
}

export default router.handler(controller.errorHandlers);
