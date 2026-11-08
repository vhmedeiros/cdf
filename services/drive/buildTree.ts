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

// Nome do módulo criado para os arquivos soltos na raiz da pasta do curso
const ROOT_MODULE_FLAT = "Aulas"; // curso sem nenhuma subpasta
const ROOT_MODULE_MIXED = "Materiais do curso"; // curso com subpastas + arquivos soltos

const IGNORED_FILENAMES = new Set([
  "index.html",
  "script.js",
  "style.css",
  "files_manifest.json",
  "player.html",
  // Arquivos de sistema que o Windows/macOS deixam nas pastas sincronizadas
  "desktop.ini",
  "thumbs.db",
  ".ds_store",
]);

export function cleanTitle(rawName: string, isFolder: boolean = false): string {
  let name = rawName;

  // Se não for pasta, remove extensão comum de arquivo (.mp4, .pdf, .docx, etc.)
  if (!isFolder) {
    name = name.replace(/\.[a-zA-Z0-9]{2,5}$/, "");
  }

  // Se o nome tiver mais de 2 pontos como separadores entre palavras (ex: "Direito.Constitucional.Aula")
  // substitui os pontos intermediários por espaços, preservando formatos como "01. Aula"
  if ((name.match(/\./g) || []).length >= 2) {
    name = name.replace(/\./g, " ");
  }

  // Substitui múltiplos underlines por espaços
  name = name.replace(/_+/g, " ");

  // Normaliza múltiplos espaços e limpa pontas, preservando números da sequência (ex: "001 Aula", "02 - Módulo")
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

  const ctx: BuildContext = { itemsByParent, manifestDurations };

  // 3. Módulos são as subpastas diretas do rootFolderId
  const directChildren = itemsByParent.get(rootFolderId) || [];
  const moduleFolders = directChildren
    .filter((it) => it.mimeType === FOLDER_MIME)
    .sort((a, b) => naturalSortCompare(a.name, b.name));

  // Arquivos soltos na raiz do curso (ex.: "curso/aula1.mp4", "curso/edital.pdf").
  // Antes eram descartados; agora viram um módulo próprio, montado com a estratégia
  // 'files' (cada vídeo inicia uma aula), já que as subpastas da raiz já são módulos.
  const rootFiles = directChildren.filter((it) => it.mimeType !== FOLDER_MIME);

  const parsedModules: ParsedModule[] = [];

  if (rootFiles.length > 0) {
    const rootLessons = buildLessonsFromFiles(rootFiles, ctx);
    if (rootLessons.length > 0) {
      // Curso "plano" (só arquivos) → módulo "Aulas".
      // Curso com pastas + arquivos soltos → os soltos vão para "Materiais do curso", no topo.
      const rootModuleName = moduleFolders.length > 0 ? ROOT_MODULE_MIXED : ROOT_MODULE_FLAT;
      parsedModules.push({
        // A própria pasta do curso identifica este módulo (chave estável entre syncs)
        driveFolderId: rootFolderId,
        rawName: rootModuleName,
        title: rootModuleName,
        position: 1,
        lessons: rootLessons,
      });
    }
  }

  for (const modFolder of moduleFolders) {
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

    const parsedLessons =
      currentStrategy === "folders"
        ? buildLessonsFromFolders(subFolders, directFiles, ctx)
        : buildLessonsFromFiles(directFiles, ctx);

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

  // Totais calculados a partir da árvore final (uma única fonte de verdade)
  let totalDurationSeconds = 0;
  let materialsCount = 0;
  for (const mod of parsedModules) {
    for (const les of mod.lessons) {
      totalDurationSeconds += les.durationSeconds;
      materialsCount += les.materials.length;
    }
  }

  return {
    modules: parsedModules,
    totalDurationSeconds,
    materialsCount,
  };
}

type BuildContext = {
  itemsByParent: Map<string, DriveItem[]>;
  manifestDurations: Map<string, number>;
};

function getDuration(file: DriveItem, ctx: BuildContext): number {
  if (file.videoMediaMetadata?.durationMillis) {
    return Math.round(Number(file.videoMediaMetadata.durationMillis) / 1000);
  }
  return ctx.manifestDurations.get(file.id) ?? 0;
}

function toMaterial(
  file: DriveItem,
  ctx: BuildContext,
  position: number,
  title: string = cleanTitle(file.name),
): ParsedMaterial {
  return {
    driveFileId: file.id,
    rawName: file.name,
    title,
    kind: detectKind(file.mimeType),
    mime: file.mimeType,
    sizeBytes: file.size ? Number(file.size) : 0,
    durationSeconds: getDuration(file, ctx),
    md5: file.md5Checksum,
    driveModifiedTime: file.modifiedTime,
    position,
  };
}

/**
 * Estratégia 'folders': cada subpasta vira uma aula (com subpastas internas achatadas);
 * arquivos soltos no módulo vão para uma aula "Materiais do módulo".
 */
function buildLessonsFromFolders(
  subFolders: DriveItem[],
  directFiles: DriveItem[],
  ctx: BuildContext,
): ParsedLesson[] {
  const lessons: ParsedLesson[] = [];
  const sortedSubFolders = [...subFolders].sort((a, b) => naturalSortCompare(a.name, b.name));

  for (const subF of sortedSubFolders) {
    const sortedFiles = getAllFilesInFolderRecursive(subF.id, ctx.itemsByParent).sort((a, b) =>
      naturalSortCompare(a.name, b.name),
    );

    const materials = sortedFiles.map((file, idx) => {
      const kind = detectKind(file.mimeType);
      const cleanedTitle = cleanTitle(file.name);
      const lowerTitle = cleanedTitle.toLowerCase();
      const displayTitle =
        lowerTitle === "ext" && kind === "video"
          ? "Vídeo da Aula"
          : lowerTitle === "content"
            ? "Conteúdo da Aula"
            : cleanedTitle;
      return toMaterial(file, ctx, idx + 1, displayTitle);
    });

    lessons.push({
      driveFolderId: subF.id,
      rawName: subF.name,
      title: cleanTitle(subF.name, true),
      position: lessons.length + 1,
      durationSeconds: materials.reduce((sum, m) => sum + m.durationSeconds, 0),
      materials,
    });
  }

  if (directFiles.length > 0) {
    const sortedDirect = [...directFiles].sort((a, b) => naturalSortCompare(a.name, b.name));
    const materials = sortedDirect.map((file, idx) => toMaterial(file, ctx, idx + 1));

    lessons.push({
      driveFolderId: null,
      rawName: "Materiais do módulo",
      title: "Materiais do módulo",
      position: lessons.length + 1,
      durationSeconds: materials.reduce((sum, m) => sum + m.durationSeconds, 0),
      materials,
    });
  }

  return lessons;
}

/**
 * Estratégia 'files': cada vídeo inicia uma aula; arquivos não-vídeo seguintes são anexados
 * a ela. Arquivos antes do primeiro vídeo formam a aula "Introdução".
 */
function buildLessonsFromFiles(files: DriveItem[], ctx: BuildContext): ParsedLesson[] {
  const lessons: ParsedLesson[] = [];
  const sortedFiles = [...files].sort((a, b) => naturalSortCompare(a.name, b.name));
  let currentLesson: ParsedLesson | null = null;

  for (const file of sortedFiles) {
    if (detectKind(file.mimeType) === "video") {
      const material = toMaterial(file, ctx, 1);
      currentLesson = {
        driveFolderId: null,
        rawName: file.name,
        title: cleanTitle(file.name),
        position: lessons.length + 1,
        durationSeconds: material.durationSeconds,
        materials: [material],
      };
      lessons.push(currentLesson);
      continue;
    }

    if (!currentLesson) {
      currentLesson = {
        driveFolderId: null,
        rawName: "Introdução",
        title: "Introdução",
        position: lessons.length + 1,
        durationSeconds: 0,
        materials: [],
      };
      lessons.push(currentLesson);
    }

    const material = toMaterial(file, ctx, currentLesson.materials.length + 1);
    currentLesson.materials.push(material);
    currentLesson.durationSeconds += material.durationSeconds;
  }

  return lessons;
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
