export type DriveItem = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  md5Checksum?: string;
  modifiedTime?: string;
  parents?: string[];
  videoMediaMetadata?: {
    durationMillis?: string;
  };
  shortcutDetails?: {
    targetId?: string;
    targetMimeType?: string;
  };
};

export type FilesManifest = {
  name?: string;
  modules?: Array<{
    name: string;
    lessons?: Array<{
      name: string;
      files?: Array<{
        id: string;
        name: string;
        duration?: number;
      }>;
    }>;
  }>;
};

export type MaterialKind = "video" | "audio" | "pdf" | "doc" | "image" | "link" | "other";

export type ParsedMaterial = {
  driveFileId: string;
  rawName: string;
  title: string;
  kind: MaterialKind;
  mime: string;
  sizeBytes: number;
  durationSeconds: number;
  md5?: string;
  driveModifiedTime?: string;
  position: number;
};

export type ParsedLesson = {
  driveFolderId?: string | null;
  rawName: string;
  title: string;
  position: number;
  durationSeconds: number;
  materials: ParsedMaterial[];
};

export type ParsedModule = {
  driveFolderId?: string;
  rawName: string;
  title: string;
  position: number;
  lessons: ParsedLesson[];
};

export type ParsedTree = {
  modules: ParsedModule[];
  totalDurationSeconds: number;
  materialsCount: number;
};

export type BuildTreeOptions = {
  rootFolderId: string;
  strategy?: "auto" | "folders" | "files";
  manifest?: FilesManifest | null;
};

const FOLDER_MIME = "application/vnd.google-apps.folder";
const SHORTCUT_MIME = "application/vnd.google-apps.shortcut";

const IGNORED_FILENAMES = new Set([
  "index.html",
  "script.js",
  "style.css",
  "files_manifest.json",
  "player.html",
]);

export function cleanTitle(rawName: string, isFolder: boolean = false): string {
  let name = rawName;

  // Se não for pasta, remove extensão comum
  if (!isFolder) {
    name = name.replace(/\.[a-zA-Z0-9]{2,5}$/, "");
  }

  // Remove prefixos numéricos como "001. ", "01 - ", "1_", "01. "
  name = name.replace(/^(\d+[\.\-_)\s]+)+/, "");

  // Se o nome tiver mais de 2 pontos como separadores (ex: "Direito.Constitucional.Aula.01")
  // substitui os pontos por espaços
  if ((name.match(/\./g) || []).length >= 2) {
    name = name.replace(/\./g, " ");
  }

  // Substitui múltiplos underlines por espaços
  name = name.replace(/_+/g, " ");

  // Normaliza múltiplos espaços e limpa pontas
  return name.replace(/\s+/g, " ").trim() || rawName;
}

export function naturalSortCompare(aName: string, bName: string): number {
  return aName.localeCompare(bName, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export function detectKind(mimeType: string): MaterialKind {
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType === "application/pdf") return "pdf";
  if (
    mimeType.startsWith("application/vnd.google-apps.document") ||
    mimeType.startsWith("application/vnd.google-apps.presentation") ||
    mimeType.startsWith("application/vnd.google-apps.spreadsheet") ||
    mimeType.includes("officedocument") ||
    mimeType.includes("msword")
  ) {
    return "doc";
  }
  if (mimeType.startsWith("image/")) return "image";
  return "other";
}

/**
 * Função Pura buildTree:
 * Transforma uma listagem plana de itens do Google Drive em uma árvore
 * Curso -> Módulos -> Aulas -> Materiais, sem nenhum efeito colateral.
 */
export function buildTree(items: DriveItem[], options: BuildTreeOptions): ParsedTree {
  const { rootFolderId, strategy = "auto", manifest } = options;

  // 1. Resolve atalhos do Drive e filtra itens ignorados
  const normalizedItems: DriveItem[] = [];

  for (const item of items) {
    if (IGNORED_FILENAMES.has(item.name.toLowerCase())) {
      continue;
    }

    if (item.mimeType === SHORTCUT_MIME && item.shortcutDetails?.targetId) {
      normalizedItems.push({
        ...item,
        id: item.shortcutDetails.targetId,
        mimeType: item.shortcutDetails.targetMimeType || "application/octet-stream",
      });
    } else {
      normalizedItems.push(item);
    }
  }

  // 2. Indexa itens por pai para navegação rápida
  const itemsByParent = new Map<string, DriveItem[]>();
  const itemById = new Map<string, DriveItem>();

  for (const item of normalizedItems) {
    itemById.set(item.id, item);
    const parentId = item.parents?.[0] || "root";
    if (!itemsByParent.has(parentId)) {
      itemsByParent.set(parentId, []);
    }
    itemsByParent.get(parentId)!.push(item);
  }

  // 3. Módulos são as subpastas diretas do rootFolderId
  const directChildren = itemsByParent.get(rootFolderId) || [];
  const moduleFolders = directChildren
    .filter((it) => it.mimeType === FOLDER_MIME)
    .sort((a, b) => naturalSortCompare(a.name, b.name));

  // Mapa de durações opcionais extraídas do manifest
  const manifestDurations = new Map<string, number>();
  if (manifest?.modules) {
    for (const mod of manifest.modules) {
      for (const les of mod.lessons || []) {
        for (const f of les.files || []) {
          if (f.id && typeof f.duration === "number") {
            manifestDurations.set(f.id, Math.round(f.duration));
          }
        }
      }
    }
  }

  const parsedModules: ParsedModule[] = [];
  let totalDurationSeconds = 0;
  let materialsCount = 0;

  for (let modIdx = 0; modIdx < moduleFolders.length; modIdx++) {
    const modFolder = moduleFolders[modIdx];
    const moduleChildren = itemsByParent.get(modFolder.id) || [];

    // Se a pasta só tem itens que foram ignorados (ex: pasta "player"), descarta
    if (moduleChildren.length === 0) {
      continue;
    }

    const subFolders = moduleChildren.filter((it) => it.mimeType === FOLDER_MIME);
    const directFiles = moduleChildren.filter((it) => it.mimeType !== FOLDER_MIME);

    // Determina a estratégia do módulo
    const currentStrategy =
      strategy === "auto" ? (subFolders.length > 0 ? "folders" : "files") : strategy;

    const parsedLessons: ParsedLesson[] = [];

    if (currentStrategy === "folders") {
      // Estratégia 'folders': cada subpasta vira uma aula
      const sortedSubFolders = subFolders.sort((a, b) => naturalSortCompare(a.name, b.name));

      for (let lesIdx = 0; lesIdx < sortedSubFolders.length; lesIdx++) {
        const subF = sortedSubFolders[lesIdx];
        const rawFiles = getAllFilesInFolderRecursive(subF.id, itemsByParent);
        const sortedFiles = rawFiles.sort((a, b) => naturalSortCompare(a.name, b.name));

        const materials: ParsedMaterial[] = [];
        let lessonDuration = 0;

        for (let matIdx = 0; matIdx < sortedFiles.length; matIdx++) {
          const file = sortedFiles[matIdx];
          const kind = detectKind(file.mimeType);

          let duration = 0;
          if (file.videoMediaMetadata?.durationMillis) {
            duration = Math.round(Number(file.videoMediaMetadata.durationMillis) / 1000);
          } else if (manifestDurations.has(file.id)) {
            duration = manifestDurations.get(file.id)!;
          }

          lessonDuration += duration;
          materialsCount++;

          const cleanedTitle = cleanTitle(file.name);
          const lowerTitle = cleanedTitle.toLowerCase();
          const displayTitle =
            lowerTitle === "ext" && kind === "video"
              ? "Vídeo da Aula"
              : lowerTitle === "content"
                ? "Conteúdo da Aula"
                : cleanedTitle;

          materials.push({
            driveFileId: file.id,
            rawName: file.name,
            title: displayTitle,
            kind,
            mime: file.mimeType,
            sizeBytes: file.size ? Number(file.size) : 0,
            durationSeconds: duration,
            md5: file.md5Checksum,
            driveModifiedTime: file.modifiedTime,
            position: matIdx + 1,
          });
        }

        totalDurationSeconds += lessonDuration;

        parsedLessons.push({
          driveFolderId: subF.id,
          rawName: subF.name,
          title: cleanTitle(subF.name, true),
          position: lesIdx + 1,
          durationSeconds: lessonDuration,
          materials,
        });
      }

      // Arquivos soltos no módulo vão para uma aula "Materiais do módulo"
      if (directFiles.length > 0) {
        const sortedDirect = directFiles.sort((a, b) => naturalSortCompare(a.name, b.name));
        const extraMaterials: ParsedMaterial[] = sortedDirect.map((file, idx) => {
          materialsCount++;
          return {
            driveFileId: file.id,
            rawName: file.name,
            title: cleanTitle(file.name),
            kind: detectKind(file.mimeType),
            mime: file.mimeType,
            sizeBytes: file.size ? Number(file.size) : 0,
            durationSeconds: 0,
            md5: file.md5Checksum,
            driveModifiedTime: file.modifiedTime,
            position: idx + 1,
          };
        });

        parsedLessons.push({
          driveFolderId: null,
          rawName: "Materiais do módulo",
          title: "Materiais do módulo",
          position: parsedLessons.length + 1,
          durationSeconds: 0,
          materials: extraMaterials,
        });
      }
    } else {
      // Estratégia 'files': cada vídeo inicia uma aula
      const sortedFiles = directFiles.sort((a, b) => naturalSortCompare(a.name, b.name));

      let currentLesson: ParsedLesson | null = null;
      let lessonPosition = 0;

      for (const file of sortedFiles) {
        const kind = detectKind(file.mimeType);

        let duration = 0;
        if (file.videoMediaMetadata?.durationMillis) {
          duration = Math.round(Number(file.videoMediaMetadata.durationMillis) / 1000);
        } else if (manifestDurations.has(file.id)) {
          duration = manifestDurations.get(file.id)!;
        }

        if (kind === "video") {
          // Inicia uma nova aula com este vídeo
          lessonPosition++;
          currentLesson = {
            driveFolderId: null,
            rawName: file.name,
            title: cleanTitle(file.name),
            position: lessonPosition,
            durationSeconds: duration,
            materials: [
              {
                driveFileId: file.id,
                rawName: file.name,
                title: cleanTitle(file.name),
                kind: "video",
                mime: file.mimeType,
                sizeBytes: file.size ? Number(file.size) : 0,
                durationSeconds: duration,
                md5: file.md5Checksum,
                driveModifiedTime: file.modifiedTime,
                position: 1,
              },
            ],
          };
          materialsCount++;
          totalDurationSeconds += duration;
          parsedLessons.push(currentLesson);
        } else {
          // Material anexado à aula atual (ou aula 'Introdução' se for antes do 1º vídeo)
          materialsCount++;
          if (!currentLesson) {
            lessonPosition++;
            currentLesson = {
              driveFolderId: null,
              rawName: "Introdução",
              title: "Introdução",
              position: lessonPosition,
              durationSeconds: 0,
              materials: [],
            };
            parsedLessons.push(currentLesson);
          }

          currentLesson.materials.push({
            driveFileId: file.id,
            rawName: file.name,
            title: cleanTitle(file.name),
            kind,
            mime: file.mimeType,
            sizeBytes: file.size ? Number(file.size) : 0,
            durationSeconds: duration,
            md5: file.md5Checksum,
            driveModifiedTime: file.modifiedTime,
            position: currentLesson.materials.length + 1,
          });
          currentLesson.durationSeconds += duration;
          totalDurationSeconds += duration;
        }
      }
    }

    if (parsedLessons.length > 0) {
      parsedModules.push({
        driveFolderId: modFolder.id,
        rawName: modFolder.name,
        title: cleanTitle(modFolder.name, true),
        position: parsedModules.length + 1,
        lessons: parsedLessons,
      });
    }
  }

  return {
    modules: parsedModules,
    totalDurationSeconds,
    materialsCount,
  };
}

function getAllFilesInFolderRecursive(
  folderId: string,
  itemsByParent: Map<string, DriveItem[]>,
): DriveItem[] {
  const result: DriveItem[] = [];
  const children = itemsByParent.get(folderId) || [];

  for (const child of children) {
    if (child.mimeType === FOLDER_MIME) {
      result.push(...getAllFilesInFolderRecursive(child.id, itemsByParent));
    } else {
      result.push(child);
    }
  }

  return result;
}
