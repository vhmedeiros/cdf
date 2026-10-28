import fs from "node:fs";
import path from "node:path";
import { ServerResponse } from "node:http";
import { getAccessToken } from "./client";

const CACHE_DIR = path.join(process.cwd(), ".cache", "media");

// Mapeia downloads em andamento para não duplicar requisições para o mesmo arquivo
const activeDownloads = new Map<string, Promise<string>>();

export function getExtensionFromMime(mimeType: string): string {
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "mp3";
  if (mimeType.includes("pdf")) return "pdf";
  return "bin";
}

export function getCachePath(driveFileId: string, mimeType: string = "video/mp4"): string {
  const ext = getExtensionFromMime(mimeType);
  return path.join(CACHE_DIR, `${driveFileId}.${ext}`);
}

export function isMediaCached(driveFileId: string, mimeType: string = "video/mp4"): boolean {
  const filePath = getCachePath(driveFileId, mimeType);
  return fs.existsSync(filePath);
}

/**
 * Garante que o arquivo esteja em cache no disco local.
 * Se já estiver, retorna imediatamente o caminho.
 * Se não estiver, baixa do Google Drive em alta velocidade e salva.
 */
export async function ensureMediaCached(
  driveFileId: string,
  mimeType: string = "video/mp4",
): Promise<string> {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  const finalPath = getCachePath(driveFileId, mimeType);

  // Se já existe e tem tamanho maior que zero, retorna direto
  if (fs.existsSync(finalPath)) {
    const stat = fs.statSync(finalPath);
    if (stat.size > 0) {
      return finalPath;
    }
  }

  // Se já tem um download em andamento para este mesmo arquivo, aguarda ele
  if (activeDownloads.has(driveFileId)) {
    return activeDownloads.get(driveFileId)!;
  }

  const downloadPromise = (async () => {
    const tempPath = `${finalPath}.downloading`;
    const token = await getAccessToken();

    if (!token) {
      throw new Error("Não foi possível autenticar com o Google Drive para baixar a mídia.");
    }

    const url = `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media&supportsAllDrives=true`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error(
        `Google Drive API retornou status ${res.status} ao baixar arquivo ${driveFileId}`,
      );
    }

    const fileStream = fs.createWriteStream(tempPath);

    if (!res.body) {
      throw new Error("Resposta do Drive sem body.");
    }

    const reader = res.body.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fileStream.write(value);
      }
      fileStream.end();

      // Renomeia o arquivo temporário para o final atômico
      fs.renameSync(tempPath, finalPath);
      return finalPath;
    } catch (err) {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      throw err;
    } finally {
      activeDownloads.delete(driveFileId);
    }
  })();

  activeDownloads.set(driveFileId, downloadPromise);
  return downloadPromise;
}

/**
 * Serve um arquivo local do disco com suporte completo a Range Requests (HTTP 206)
 */
export function streamLocalFile(
  filePath: string,
  rangeHeader: string | undefined,
  mimeType: string,
  res: ServerResponse,
): void {
  const stat = fs.statSync(filePath);
  const totalSize = stat.size;

  res.setHeader("Content-Type", mimeType);
  res.setHeader("Accept-Ranges", "bytes");

  if (rangeHeader) {
    const parts = rangeHeader.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

    if (start >= totalSize || end >= totalSize) {
      res.writeHead(416, {
        "Content-Range": `bytes */${totalSize}`,
      });
      res.end();
      return;
    }

    const chunkSize = end - start + 1;

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${totalSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": mimeType,
    });

    const stream = fs.createReadStream(filePath, { start, end });
    stream.pipe(res);
  } else {
    res.writeHead(200, {
      "Content-Length": totalSize,
      "Content-Type": mimeType,
      "Accept-Ranges": "bytes",
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  }
}
