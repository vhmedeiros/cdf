import orchestrator from "@/tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

beforeEach(async () => {
  await orchestrator.clearDatabase();
});

describe("Notes API (/api/v1/notes)", () => {
  describe("Anonymous user", () => {
    test("Receives 401 Unauthorized", async () => {
      const response = await fetch("http://localhost:3000/api/v1/notes");
      expect(response.status).toBe(401);
    });
  });

  describe("Enrolled Student", () => {
    test("Creates, lists, updates, and deletes notes", async () => {
      const { default: User } = await import("@/models/user");
      const { default: Session } = await import("@/models/session");
      const { default: CourseModel } = await import("@/models/course");
      const { default: EnrollmentModel } = await import("@/models/enrollment");

      // 1. Cria aluno e sessão
      const student = await User.create({
        email: "aluno.notes@teste.com",
        password: "senha-notes-123",
        display_name: "Aluno Notas",
        features: ["read:course"],
      });
      const session = await Session.create(student.id);

      // 2. Cria curso e material
      const course = await CourseModel.create({
        title: "Curso Notas",
        slug: "curso-notas",
        driveUrl: "https://drive.google.com/drive/folders/pasta-notes",
        driveFolderId: "pasta-notes",
        status: "published",
      });

      await EnrollmentModel.create({
        userId: student.id,
        courseId: course.id,
      });

      await CourseModel.syncTreeToDatabase(course.id, {
        totalDurationSeconds: 300,
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
                durationSeconds: 300,
                materials: [
                  {
                    driveFileId: "file-notes-1",
                    rawName: "Video.mp4",
                    title: "Video Aula",
                    kind: "video",
                    mime: "video/mp4",
                    sizeBytes: 1048576,
                    durationSeconds: 300,
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

      // 3. Cria uma anotação com timestamp 45.2s
      const createRes = await fetch("http://localhost:3000/api/v1/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify({
          material_id: materialId,
          timestamp_seconds: 45.2,
          body: "Conceito fundamental explicado aqui pelo professor.",
          is_important: false,
        }),
      });

      expect(createRes.status).toBe(201);
      const createdNote = await createRes.json();
      expect(createdNote.id).toBeDefined();
      expect(createdNote.timestamp_seconds).toBe(45.2);
      expect(createdNote.body).toBe("Conceito fundamental explicado aqui pelo professor.");
      expect(createdNote.is_important).toBe(false);

      // 4. Lista anotações daquele material
      const listRes = await fetch(`http://localhost:3000/api/v1/notes?material_id=${materialId}`, {
        headers: { Cookie: `session_id=${session.token}` },
      });
      expect(listRes.status).toBe(200);
      const notesList = await listRes.json();
      expect(notesList).toHaveLength(1);
      expect(notesList[0].id).toBe(createdNote.id);

      // 5. Atualiza a anotação para marcar como importante
      const updateRes = await fetch(`http://localhost:3000/api/v1/notes/${createdNote.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify({
          is_important: true,
          body: "Conceito ATUALIZADO: Lembrar para a prova!",
        }),
      });

      expect(updateRes.status).toBe(200);
      const updatedNote = await updateRes.json();
      expect(updatedNote.is_important).toBe(true);
      expect(updatedNote.body).toBe("Conceito ATUALIZADO: Lembrar para a prova!");

      // 6. Exclui a anotação
      const deleteRes = await fetch(`http://localhost:3000/api/v1/notes/${createdNote.id}`, {
        method: "DELETE",
        headers: { Cookie: `session_id=${session.token}` },
      });
      expect(deleteRes.status).toBe(200);

      // 7. Confirma lista vazia
      const emptyListRes = await fetch(
        `http://localhost:3000/api/v1/notes?material_id=${materialId}`,
        {
          headers: { Cookie: `session_id=${session.token}` },
        },
      );
      const emptyList = await emptyListRes.json();
      expect(emptyList).toHaveLength(0);
    });
  });
});
