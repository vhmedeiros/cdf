import fs from "node:fs";
import path from "node:path";
import { GoogleAuth } from "google-auth-library";
import { DriveItem } from "./buildTree";

/**
 * Busca o arquivo de credenciais da Service Account do Google em múltiplos caminhos
 */
export function getServiceAccountPath(): string | null {
  const candidates = [
    process.env.GOOGLE_SA_FILE,
    "/run/secrets/gdrive_sa.json",
    path.join(process.cwd(), "secrets", "gdrive_sa.json"),
    path.join(process.cwd(), "gdrive_sa.json"),
    "/app/secrets/gdrive_sa.json",
    "/app/gdrive_sa.json",
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

/**
 * Extrai o folder ID de um link de pasta do Google Drive:
 * - https://drive.google.com/drive/folders/1a2b3c4d5e
 * - https://drive.google.com/drive/u/0/folders/1a2b3c4d5e?usp=sharing
 * - https://drive.google.com/open?id=1a2b3c4d5e
 * - ID puro: 1a2b3c4d5e
 *
 * Retorna `null` para links de arquivo (`/file/d/...`), que não servem para curso.
 */
export function extractFolderId(input: string): string | null {
  const trimmed = input.trim();

  if (!trimmed) return null;

  // Link de arquivo não é pasta de curso; material usa outra rota.
  if (/\/file\/d\//.test(trimmed)) {
    return null;
  }

  // Formato /folders/<ID>
  const foldersMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (foldersMatch) {
    return foldersMatch[1];
  }

  // Formato ?id=<ID> ou &id=<ID>
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch) {
    return idParamMatch[1];
  }

  // Se já for o ID puro (sem barras, pontos ou dois-pontos)
  if (/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export type DriveFileMetadata = {
  id: string;
  name: string;
  mimeType: string;
};

/**
 * Busca metadados de um item do Drive para validar se é pasta antes de criar/sincronizar.
 * Retorna `null` quando não há credencial disponível ou o item não existe.
 */
export async function getDriveFileMetadata(fileId: string): Promise<DriveFileMetadata | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  const url = new URL(`https://www.googleapis.com/drive/v3/files/${fileId}`);
  url.searchParams.set("fields", "id,name,mimeType");
  url.searchParams.set("supportsAllDrives", "true");

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) return null;

  const data = await response.json();
  if (!data?.id || !data?.mimeType) return null;

  return {
    id: data.id,
    name: data.name || "",
    mimeType: data.mimeType,
  };
}

export const GOOGLE_DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder";

/**
 * Obtém o token de acesso da Service Account do Google Drive
 */
export async function getAccessToken(): Promise<string | null> {
  const saFile = getServiceAccountPath();

  if (!saFile) {
    console.warn("⚠️ [GoogleDrive] Nenhum arquivo gdrive_sa.json encontrado nos caminhos padrão.");
    return null;
  }

  try {
    const auth = new GoogleAuth({
      keyFile: saFile,
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });

    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    return tokenResponse.token || null;
  } catch (error: any) {
    console.error(
      "❌ [GoogleDrive] Erro ao obter access token do Google:",
      error?.message || error,
    );
    return null;
  }
}

/**
 * Varre a pasta raiz e todas as suas subpastas recursivamente
 */
export async function fetchDriveFolderItems(rootFolderId: string): Promise<DriveItem[]> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return [];
  }

  const items: DriveItem[] = [];
  const foldersToScan = [rootFolderId];
  const scannedFolders = new Set<string>();

  const fields =
    "nextPageToken,files(id,name,mimeType,size,md5Checksum,modifiedTime,videoMediaMetadata,shortcutDetails,parents)";

  while (foldersToScan.length > 0) {
    const currentFolderId = foldersToScan.shift()!;
    if (scannedFolders.has(currentFolderId)) continue;
    scannedFolders.add(currentFolderId);

    let pageToken: string | undefined;

    do {
      const url = new URL("https://www.googleapis.com/drive/v3/files");
      url.searchParams.set("q", `trashed = false and '${currentFolderId}' in parents`);
      url.searchParams.set("fields", fields);
      url.searchParams.set("pageSize", "1000");
      url.searchParams.set("supportsAllDrives", "true");
      url.searchParams.set("includeItemsFromAllDrives", "true");
      if (pageToken) {
        url.searchParams.set("pageToken", pageToken);
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Erro na API do Google Drive (${response.status}): ${err}`);
      }

      const data = await response.json();
      if (Array.isArray(data.files)) {
        for (const file of data.files) {
          items.push(file);
          // Se for subpasta, enfileira para varredura recursiva
          if (file.mimeType === "application/vnd.google-apps.folder") {
            foldersToScan.push(file.id);
          }
        }
      }

      pageToken = data.nextPageToken;
    } while (pageToken);
  }

  return items;
}

/**
 * Obtém stream de arquivo do Google Drive com suporte opcional a Range
 */
export async function getDriveFileStream(
  driveFileId: string,
  rangeHeader?: string,
): Promise<Response | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  const url = `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media&supportsAllDrives=true`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };

  if (rangeHeader) {
    headers.Range = rangeHeader;
  }

  const response = await fetch(url, { headers });
  if (!response.ok && response.status !== 206) {
    console.error(`Erro ao obter stream do Drive (${response.status}):`, await response.text());
    return null;
  }

  return response;
}
