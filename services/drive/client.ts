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

export async function fetchDriveFolderItems(folderId: string): Promise<DriveItem[]> {
  const saFile = process.env.GOOGLE_SA_FILE;

  // Se não houver Service Account configurada (offline dev ou testes),
  // retorna lista vazia ou dados mockados
  if (!saFile || !fs.existsSync(saFile)) {
    return [];
  }

  const auth = new GoogleAuth({
    keyFile: saFile,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });

  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const accessToken = tokenResponse.token;

  if (!accessToken) {
    throw new Error("Não foi possível obter o token da Service Account.");
  }

  const items: DriveItem[] = [];
  let pageToken: string | undefined;

  const fields =
    "nextPageToken,files(id,name,mimeType,size,md5Checksum,modifiedTime,videoMediaMetadata,shortcutDetails,parents)";

  do {
    const url = new URL("https://www.googleapis.com/drive/v3/files");
    url.searchParams.set("q", `trashed = false and '${folderId}' in parents`);
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
      items.push(...data.files);
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return items;
}
