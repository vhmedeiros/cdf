import fs from "node:fs";
import { GoogleAuth } from "google-auth-library";
import { DriveItem } from "./buildTree";

/**
 * Extrai o folder ID de qualquer formato de link do Google Drive:
 * - https://drive.google.com/drive/folders/1a2b3c4d5e
 * - https://drive.google.com/drive/u/0/folders/1a2b3c4d5e?usp=sharing
 * - https://drive.google.com/open?id=1a2b3c4d5e
 * - ID puro: 1a2b3c4d5e
 */
export function extractFolderId(input: string): string {
  const trimmed = input.trim();

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

  // Se já for o ID puro (sem barras ou pontos de interrogação)
  if (/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return trimmed;
  }

  return trimmed;
}

/**
 * Obtém o token de acesso da Service Account do Google Drive
 */
export async function getAccessToken(): Promise<string | null> {
  const saFile = process.env.GOOGLE_SA_FILE;

  if (!saFile || !fs.existsSync(saFile)) {
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
  } catch (error) {
    console.error("Erro ao obter access token do Google:", error);
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
