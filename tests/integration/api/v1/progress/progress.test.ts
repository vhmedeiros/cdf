import orchestrator from "@/tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

beforeEach(async () => {
  await orchestrator.clearDatabase();
});

describe("Progress API (/api/v1/progress)", () => {
  describe("Anonymous user", () => {
    test("Receives 401 Unauthorized", async () => {
      const response = await fetch(
        "http://localhost:3000/api/v1/progress/00000000-0000-0000-0000-000000000000",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position_seconds: 10 }),
        },
      );
      expect(response.status).toBe(401);
    });
  });

  describe("Enrolled Student", () => {
    test("Updates progress, auto-completes at 90%, and retrieves summary", async () => {
      const { default: User } = await import("@/models/user");
      const { default: Session } = await import("@/models/session");
      const { default: CourseModel } = await import("@/models/course");
      const { default: EnrollmentModel } = await import("@/models/enrollment");

      // 1. Cria aluno e sessão
      const student = await User.create({
        email: "aluno.progress@teste.com",
        password: "senha-progress-123",
        display_name: "Aluno Progresso",
        features: ["read:course"],
      });
      const session = await Session.create(student.id);

      // 2. Cria curso com 1 vídeo de 100 segundos
      const course = await CourseModel.create({
        title: "Curso Progresso",
        slug: "curso-progresso",
        driveUrl: "https://drive.google.com/drive/folders/pasta-progress",
        driveFolderId: "pasta-progress",
        status: "published",
      });

      await EnrollmentModel.create({
        userId: student.id,
        courseId: course.id,
      });

      await CourseModel.syncTreeToDatabase(course.id, {
        totalDurationSeconds: 100,
        materialsCount: 1,
        modules: [
          {
            rawName: "Modulo 1",
            title: "Modulo 1",
            position: 1,
            lessons: [
              {
                rawName: "Aula 1",
                title: "Aula 1",
                position: 1,
                durationSeconds: 100,
                materials: [
                  {
                    driveFileId: "file-progress-1",
                    rawName: "Video.mp4",
                    title: "Video de 100s",
                    kind: "video",
                    mime: "video/mp4",
                    sizeBytes: 1048576,
                    durationSeconds: 100,
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

      // 3. Atualiza progresso para 50 segundos (50%) -> Não deve estar concluído
      const res1 = await fetch(`http://localhost:3000/api/v1/progress/${materialId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify({
          position_seconds: 50,
          watched_delta: 50,
        }),
      });

      expect(res1.status).toBe(200);
      const data1 = await res1.json();
      expect(data1.position_seconds).toBe(50);
      expect(data1.watched_seconds).toBe(50);
      expect(data1.is_completed).toBe(false);

      // 4. Atualiza progresso para 91 segundos (91%) -> Deve marcar como concluído automaticamente!
      const res2 = await fetch(`http://localhost:3000/api/v1/progress/${materialId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify({
          position_seconds: 91,
          watched_delta: 41,
        }),
      });

      expect(res2.status).toBe(200);
      const data2 = await res2.json();
      expect(data2.position_seconds).toBe(91);
      expect(data2.is_completed).toBe(true);
      expect(data2.completed_at).not.toBeNull();

      // 5. Consulta resumo do curso
      const summaryRes = await fetch(
        `http://localhost:3000/api/v1/progress?course_id=${course.id}`,
        {
          headers: { Cookie: `session_id=${session.token}` },
        },
      );
      expect(summaryRes.status).toBe(200);
      const summaryData = await summaryRes.json();
      expect(summaryData.summary.total_materials).toBe(1);
      expect(summaryData.summary.completed_materials).toBe(1);
      expect(summaryData.summary.percent).toBe(100);
      expect(summaryData.summary.last_material_id).toBe(materialId);
    });
  });
});
