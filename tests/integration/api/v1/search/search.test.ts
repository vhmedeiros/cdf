import orchestrator from "@/tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

beforeEach(async () => {
  await orchestrator.clearDatabase();
});

describe("Search API (/api/v1/search)", () => {
  describe("Anonymous user", () => {
    test("Receives 401 Unauthorized", async () => {
      const response = await fetch("http://localhost:3000/api/v1/search?q=teste");
      expect(response.status).toBe(401);
    });
  });

  describe("Enrolled Student", () => {
    test("Finds courses, materials and personal notes using unaccent search", async () => {
      const { default: User } = await import("@/models/user");
      const { default: Session } = await import("@/models/session");
      const { default: CourseModel } = await import("@/models/course");
      const { default: NoteModel } = await import("@/models/note");

      // 1. Cria usuário e sessão
      const student = await User.create({
        email: "aluno.busca@teste.com",
        password: "senha-busca-123",
        display_name: "Aluno Busca",
        features: ["read:course"],
      });
      const session = await Session.create(student.id);

      // 2. Cria outro aluno para garantir isolamento das notas
      const otherStudent = await User.create({
        email: "outro.aluno@teste.com",
        password: "senha-outro-123",
        display_name: "Outro Aluno",
        features: ["read:course"],
      });

      // 3. Cria curso com acentuação
      const course = await CourseModel.create({
        title: "Legislação e Administração Pública",
        slug: "legislacao-administracao",
        driveUrl: "https://drive.google.com/drive/folders/pasta-busca",
        driveFolderId: "pasta-busca",
        status: "published",
      });

      await CourseModel.syncTreeToDatabase(course.id, {
        totalDurationSeconds: 200,
        materialsCount: 1,
        modules: [
          {
            rawName: "Módulo 1: Princípios",
            title: "Módulo 1: Princípios",
            position: 1,
            lessons: [
              {
                rawName: "Aula 1: Conceituação",
                title: "Aula 1: Conceituação",
                position: 1,
                durationSeconds: 200,
                materials: [
                  {
                    driveFileId: "file-busca-1",
                    rawName: "Acentuacao.mp4",
                    title: "Vídeo sobre Discricionariedade",
                    kind: "video",
                    mime: "video/mp4",
                    sizeBytes: 1000,
                    durationSeconds: 200,
                    position: 1,
                  },
                ],
              },
            ],
          },
        ],
      });

      const tree = await CourseModel.getTree(course.id);
      const materialId = tree.modules[0].lessons[0].materials[0].id;

      // 4. Cria anotação com acentos para o aluno
      await NoteModel.create(student.id, {
        materialId,
        body: "Importante: Atenção à prescrição e decadência tributária",
        timestampSeconds: 45,
        isImportant: true,
      });

      // Anotação do outro aluno com a palavra "prescrição"
      await NoteModel.create(otherStudent.id, {
        materialId,
        body: "Anotação secreta do outro aluno sobre prescrição",
        timestampSeconds: 60,
      });

      // 5. Busca sem acento: "prescricao"
      const noteSearchResponse = await fetch("http://localhost:3000/api/v1/search?q=prescricao", {
        headers: {
          cookie: `session_id=${session.token}`,
        },
      });

      expect(noteSearchResponse.status).toBe(200);
      const noteResults = await noteSearchResponse.json();

      expect(noteResults.notes).toHaveLength(1);
      expect(noteResults.notes[0].body).toContain("Atenção à prescrição e decadência");
      expect(noteResults.notes[0].material_title).toBe("Vídeo sobre Discricionariedade");

      // 6. Busca sem acento em curso: "administracao"
      const courseSearchResponse = await fetch(
        "http://localhost:3000/api/v1/search?q=administracao",
        {
          headers: {
            cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(courseSearchResponse.status).toBe(200);
      const courseResults = await courseSearchResponse.json();
      expect(courseResults.courses).toHaveLength(1);
      expect(courseResults.courses[0].title).toBe("Legislação e Administração Pública");

      // 7. Busca sem acento em material: "discricionariedade"
      const matSearchResponse = await fetch(
        "http://localhost:3000/api/v1/search?q=discricionariedade",
        {
          headers: {
            cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(matSearchResponse.status).toBe(200);
      const matResults = await matSearchResponse.json();
      expect(matResults.materials).toHaveLength(1);
      expect(matResults.materials[0].title).toBe("Vídeo sobre Discricionariedade");
    });
  });
});
