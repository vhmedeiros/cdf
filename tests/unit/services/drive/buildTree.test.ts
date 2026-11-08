import { buildTree, cleanTitle, DriveItem, FilesManifest } from "@/services/drive/buildTree";

describe("buildTree pure function", () => {
  describe("cleanTitle", () => {
    test("removes extensions and preserves sequence numbers", () => {
      expect(cleanTitle("001. Introdução ao Curso.mp4")).toBe("001. Introdução ao Curso");
      expect(cleanTitle("02 - Conceitos Básicos.pdf")).toBe("02 - Conceitos Básicos");
      expect(cleanTitle("1_Primeiros_Passos.mp4")).toBe("1 Primeiros Passos");
    });

    test("normalizes dotted words into spaced titles", () => {
      expect(cleanTitle("Camara.dos.Deputados.Analista.Legislativo.pdf")).toBe(
        "Camara dos Deputados Analista Legislativo",
      );
    });

    test("preserves folder titles correctly", () => {
      expect(cleanTitle("001. Módulo 01 - Fundamentos", true)).toBe("001. Módulo 01 - Fundamentos");
    });
  });

  describe("buildTree strategies", () => {
    test("Strategy 'folders': subfolders become lessons, loose files go to 'Materiais do módulo'", () => {
      const items: DriveItem[] = [
        // Root
        {
          id: "folder-mod-1",
          name: "001. Módulo Inicial",
          mimeType: "application/vnd.google-apps.folder",
          parents: ["root"],
        },
        // Subfolders of Mod 1 (Aulas)
        {
          id: "folder-les-1",
          name: "01. Boas-vindas",
          mimeType: "application/vnd.google-apps.folder",
          parents: ["folder-mod-1"],
        },
        {
          id: "file-vid-1",
          name: "001. Video.mp4",
          mimeType: "video/mp4",
          parents: ["folder-les-1"],
          videoMediaMetadata: { durationMillis: "120000" }, // 120s
        },
        // Loose file in module
        {
          id: "file-loose-1",
          name: "Ementa.pdf",
          mimeType: "application/pdf",
          parents: ["folder-mod-1"],
        },
      ];

      const tree = buildTree(items, {
        rootFolderId: "root",
        strategy: "folders",
      });

      expect(tree.modules).toHaveLength(1);
      const mod = tree.modules[0];
      expect(mod.title).toBe("001. Módulo Inicial");
      expect(mod.lessons).toHaveLength(2);

      // Aula 1: Boas-vindas
      expect(mod.lessons[0].title).toBe("01. Boas-vindas");
      expect(mod.lessons[0].materials).toHaveLength(1);
      expect(mod.lessons[0].materials[0].kind).toBe("video");
      expect(mod.lessons[0].materials[0].durationSeconds).toBe(120);

      // Aula 2: Materiais soltos do módulo
      expect(mod.lessons[1].title).toBe("Materiais do módulo");
      expect(mod.lessons[1].materials).toHaveLength(1);
      expect(mod.lessons[1].materials[0].kind).toBe("pdf");

      expect(tree.totalDurationSeconds).toBe(120);
      expect(tree.materialsCount).toBe(2);
    });

    test("Strategy 'files': each video starts a lesson, non-videos attach", () => {
      const items: DriveItem[] = [
        {
          id: "mod-1",
          name: "01. Módulo Direto",
          mimeType: "application/vnd.google-apps.folder",
          parents: ["root"],
        },
        // File before any video -> goes to 'Introdução'
        {
          id: "doc-intro",
          name: "000. Plano_de_Aula.pdf",
          mimeType: "application/pdf",
          parents: ["mod-1"],
        },
        // First video -> Lesson 1
        {
          id: "vid-1",
          name: "001. Aula 01.mp4",
          mimeType: "video/mp4",
          parents: ["mod-1"],
          videoMediaMetadata: { durationMillis: "60000" },
        },
        // Non-video after video 1 -> attaches to Lesson 1
        {
          id: "slides-1",
          name: "002. Slides 01.pdf",
          mimeType: "application/pdf",
          parents: ["mod-1"],
        },
        // Second video -> Lesson 2
        {
          id: "vid-2",
          name: "003. Aula 02.mp4",
          mimeType: "video/mp4",
          parents: ["mod-1"],
          videoMediaMetadata: { durationMillis: "90000" },
        },
      ];

      const tree = buildTree(items, {
        rootFolderId: "root",
        strategy: "files",
      });

      expect(tree.modules).toHaveLength(1);
      const mod = tree.modules[0];
      expect(mod.lessons).toHaveLength(3);

      expect(mod.lessons[0].title).toBe("Introdução");
      expect(mod.lessons[0].materials).toHaveLength(1);

      expect(mod.lessons[1].title).toBe("001. Aula 01");
      expect(mod.lessons[1].materials).toHaveLength(2); // video + slides

      expect(mod.lessons[2].title).toBe("003. Aula 02");
      expect(mod.lessons[2].materials).toHaveLength(1);

      expect(tree.totalDurationSeconds).toBe(150); // 60 + 90
      expect(tree.materialsCount).toBe(4);
    });

    test("Strategy 'auto': selects folders when subfolders exist, files otherwise", () => {
      const items: DriveItem[] = [
        {
          id: "mod-auto-folders",
          name: "01. Tem Subpastas",
          mimeType: "application/vnd.google-apps.folder",
          parents: ["root"],
        },
        {
          id: "sub-1",
          name: "Aula 1",
          mimeType: "application/vnd.google-apps.folder",
          parents: ["mod-auto-folders"],
        },
        {
          id: "vid-a",
          name: "Vídeo.mp4",
          mimeType: "video/mp4",
          parents: ["sub-1"],
        },
      ];

      const tree = buildTree(items, { rootFolderId: "root" });
      expect(tree.modules[0].lessons[0].title).toBe("Aula 1");
    });
  });

  describe("Files directly in the course root folder", () => {
    test("Flat course (no subfolders): root files become a single 'Aulas' module", () => {
      const items: DriveItem[] = [
        {
          id: "file-pdf-intro",
          name: "000. Cronograma.pdf",
          mimeType: "application/pdf",
          parents: ["root"],
        },
        {
          id: "file-vid-2",
          name: "aula2.mp4",
          mimeType: "video/mp4",
          parents: ["root"],
          videoMediaMetadata: { durationMillis: "60000" },
        },
        {
          id: "file-vid-10",
          name: "aula10.mp4",
          mimeType: "video/mp4",
          parents: ["root"],
          videoMediaMetadata: { durationMillis: "30000" },
        },
        {
          id: "file-vid-1",
          name: "aula1.mp4",
          mimeType: "video/mp4",
          parents: ["root"],
          videoMediaMetadata: { durationMillis: "90000" },
        },
        {
          id: "file-pdf-1",
          name: "aula1.pdf",
          mimeType: "application/pdf",
          parents: ["root"],
        },
      ];

      const tree = buildTree(items, { rootFolderId: "root", strategy: "auto" });

      expect(tree.modules).toHaveLength(1);
      const mod = tree.modules[0];
      expect(mod.title).toBe("Aulas");
      expect(mod.position).toBe(1);
      // A pasta do curso é a chave estável do módulo nos syncs
      expect(mod.driveFolderId).toBe("root");

      // Ordenação natural: aula1.mp4 < aula1.pdf < aula2 < aula10
      expect(mod.lessons.map((l) => l.title)).toEqual(["Introdução", "aula1", "aula2", "aula10"]);
      expect(mod.lessons.map((l) => l.position)).toEqual([1, 2, 3, 4]);
      expect(mod.lessons[0].materials.map((m) => m.driveFileId)).toEqual(["file-pdf-intro"]);
      expect(mod.lessons[1].materials.map((m) => m.driveFileId)).toEqual([
        "file-vid-1",
        "file-pdf-1",
      ]);

      expect(tree.materialsCount).toBe(5);
      expect(tree.totalDurationSeconds).toBe(180);
    });

    test("Root files are grouped by video even when strategy is forced to 'folders'", () => {
      const items: DriveItem[] = [
        { id: "v1", name: "01. Aula.mp4", mimeType: "video/mp4", parents: ["root"] },
        { id: "v2", name: "02. Aula.mp4", mimeType: "video/mp4", parents: ["root"] },
      ];

      const tree = buildTree(items, { rootFolderId: "root", strategy: "folders" });

      expect(tree.modules).toHaveLength(1);
      expect(tree.modules[0].lessons).toHaveLength(2);
    });

    test("Mixed course: loose root files become a 'Materiais do curso' module placed first", () => {
      const items: DriveItem[] = [
        {
          id: "folder-mod-1",
          name: "001. Módulo 1",
          mimeType: "application/vnd.google-apps.folder",
          parents: ["root"],
        },
        { id: "v-mod", name: "01. Aula.mp4", mimeType: "video/mp4", parents: ["folder-mod-1"] },
        { id: "edital", name: "Edital.pdf", mimeType: "application/pdf", parents: ["root"] },
      ];

      const tree = buildTree(items, { rootFolderId: "root", strategy: "auto" });

      expect(tree.modules.map((m) => m.title)).toEqual(["Materiais do curso", "001. Módulo 1"]);
      expect(tree.modules.map((m) => m.position)).toEqual([1, 2]);
      expect(tree.modules[0].lessons[0].materials[0].driveFileId).toBe("edital");
      expect(tree.materialsCount).toBe(2);
    });

    test("Root with only legacy player or system files does not create a root module", () => {
      const items: DriveItem[] = [
        {
          id: "folder-mod-1",
          name: "001. Módulo 1",
          mimeType: "application/vnd.google-apps.folder",
          parents: ["root"],
        },
        { id: "v-mod", name: "01. Aula.mp4", mimeType: "video/mp4", parents: ["folder-mod-1"] },
        { id: "idx", name: "index.html", mimeType: "text/html", parents: ["root"] },
        { id: "mf", name: "files_manifest.json", mimeType: "application/json", parents: ["root"] },
        { id: "ini", name: "desktop.ini", mimeType: "text/plain", parents: ["root"] },
        { id: "ds", name: ".DS_Store", mimeType: "application/octet-stream", parents: ["root"] },
      ];

      const tree = buildTree(items, { rootFolderId: "root", strategy: "auto" });

      expect(tree.modules.map((m) => m.title)).toEqual(["001. Módulo 1"]);
      expect(tree.materialsCount).toBe(1);
    });
  });

  describe("Legacy files & manifest support", () => {
    test("Ignores legacy player files and folders containing only them", () => {
      const items: DriveItem[] = [
        {
          id: "mod-real",
          name: "01. Módulo Real",
          mimeType: "application/vnd.google-apps.folder",
          parents: ["root"],
        },
        {
          id: "vid-real",
          name: "Aula.mp4",
          mimeType: "video/mp4",
          parents: ["mod-real"],
        },
        // Legacy folder
        {
          id: "folder-player",
          name: "player",
          mimeType: "application/vnd.google-apps.folder",
          parents: ["root"],
        },
        {
          id: "player-html",
          name: "index.html",
          mimeType: "text/html",
          parents: ["folder-player"],
        },
        {
          id: "player-js",
          name: "script.js",
          mimeType: "application/javascript",
          parents: ["folder-player"],
        },
        {
          id: "player-css",
          name: "style.css",
          mimeType: "text/css",
          parents: ["folder-player"],
        },
      ];

      const tree = buildTree(items, { rootFolderId: "root" });
      expect(tree.modules).toHaveLength(1);
      expect(tree.modules[0].title).toBe("01. Módulo Real");
    });

    test("Uses manifest as optional duration hint when metadata is missing", () => {
      const items: DriveItem[] = [
        {
          id: "mod-1",
          name: "01. Modulo",
          mimeType: "application/vnd.google-apps.folder",
          parents: ["root"],
        },
        {
          id: "vid-sem-meta",
          name: "Aula_Sem_Meta.mp4",
          mimeType: "video/mp4",
          parents: ["mod-1"],
          // No durationMillis here
        },
      ];

      const manifest: FilesManifest = {
        name: "Curso",
        modules: [
          {
            name: "Modulo",
            lessons: [
              {
                name: "Aula",
                files: [{ id: "vid-sem-meta", name: "Aula", duration: 420.5 }],
              },
            ],
          },
        ],
      };

      const tree = buildTree(items, {
        rootFolderId: "root",
        manifest,
      });

      expect(tree.modules[0].lessons[0].durationSeconds).toBe(421); // rounded
      expect(tree.modules[0].lessons[0].materials[0].durationSeconds).toBe(421);
    });

    test("Resolves Drive shortcuts properly", () => {
      const items: DriveItem[] = [
        {
          id: "mod-1",
          name: "01. Modulo",
          mimeType: "application/vnd.google-apps.folder",
          parents: ["root"],
        },
        {
          id: "shortcut-item",
          name: "Aula Atalho.mp4",
          mimeType: "application/vnd.google-apps.shortcut",
          parents: ["mod-1"],
          shortcutDetails: {
            targetId: "target-real-video-id",
            targetMimeType: "video/mp4",
          },
        },
      ];

      const tree = buildTree(items, { rootFolderId: "root" });
      const mat = tree.modules[0].lessons[0].materials[0];
      expect(mat.driveFileId).toBe("target-real-video-id");
      expect(mat.kind).toBe("video");
    });
  });
});
