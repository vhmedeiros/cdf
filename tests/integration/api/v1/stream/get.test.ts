import orchestrator from "@/tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

beforeEach(async () => {
  await orchestrator.clearDatabase();
});

describe("GET /api/v1/stream/[id]", () => {
  describe("Anonymous user", () => {
    test("Receives 401 Unauthorized", async () => {
      const response = await fetch(
        "http://localhost:3000/api/v1/stream/00000000-0000-0000-0000-000000000000",
      );
      expect(response.status).toBe(401);
    });
  });

  describe("Enrolled Student", () => {
    test("Receives 206 Partial Content when requesting byte ranges (seeking in video)", async () => {
      const { default: User } = await import("@/models/user");
      const { default: CourseModel } = await import("@/models/course");
      const { default: EnrollmentModel } = await import("@/models/enrollment");

      // 1. Cria aluno
      const student = await User.create({
        email: "aluno.stream@teste.com",
        password: "senha-stream-123",
        display_name: "Aluno Streaming",
        features: ["read:course"],
      });

      // 2. Cria curso e material
      const course = await CourseModel.create({
        title: "Curso Streaming",
        slug: "curso-streaming",
        driveUrl: "https://drive.google.com/drive/folders/pasta-stream",
        driveFolderId: "pasta-stream",
        status: "published",
      });

      await EnrollmentModel.create({
        userId: student.id,
        courseId: course.id,
      });

      await CourseModel.syncTreeToDatabase(course.id, {
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
                durationSeconds: 600,
                materials: [
                  {
                    driveFileId: "drive-video-stream-id",
                    rawName: "Video.mp4",
                    title: "Video",
                    kind: "video",
                    mime: "video/mp4",
                    sizeBytes: 10485760, // 10MB
                    durationSeconds: 600,
                    position: 1,
                  },
                ],
              },
            ],
          },
        ],
        totalDurationSeconds: 600,
        materialsCount: 1,
      });

      // Busca o ID do material criado
      const tree = await CourseModel.getTree(course.id);
      const materialId = tree!.modules[0].lessons[0].materials[0].id;

      // 3. Login do aluno
      const loginRes = await fetch("http://localhost:3000/api/v1/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "aluno.stream@teste.com",
          password: "senha-stream-123",
        }),
      });
      const cookie = loginRes.headers.get("set-cookie") || "";

      // 4. Faz requisição de Range (seek de vídeo do player: bytes 0 a 1023)
      const response = await fetch(`http://localhost:3000/api/v1/stream/${materialId}`, {
        headers: {
          Cookie: cookie.split(";")[0],
          Range: "bytes=0-1023",
        },
      });

      expect(response.status).toBe(206);
      expect(response.headers.get("accept-ranges")).toBe("bytes");
      expect(response.headers.get("content-range")).toContain("bytes 0-1023/");
      expect(response.headers.get("content-length")).toBe("1024");
      expect(response.headers.get("content-type")).toBe("video/mp4");

      // Garante que o token interno do Drive NUNCA vaza para o cliente
      expect(response.headers.get("x-drive-token")).toBeNull();
      expect(response.headers.get("authorization")).toBeNull();
    });

    test("Receives 403 Forbidden when student is not enrolled in the course", async () => {
      const { default: User } = await import("@/models/user");
      const { default: CourseModel } = await import("@/models/course");

      const student = await User.create({
        email: "aluno.sem.acesso@teste.com",
        password: "senha-stream-123",
        display_name: "Aluno Sem Acesso",
        features: ["read:course"],
      });

      const course = await CourseModel.create({
        title: "Curso Bloqueado",
        slug: "curso-bloqueado",
        driveUrl: "https://drive.google.com/drive/folders/pasta-lock",
        driveFolderId: "pasta-lock",
        status: "published",
      });

      await CourseModel.syncTreeToDatabase(course.id, {
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
                    driveFileId: "drive-video-bloqueado",
                    rawName: "Video.mp4",
                    title: "Video",
                    kind: "video",
                    mime: "video/mp4",
                    sizeBytes: 1000,
                    durationSeconds: 100,
                    position: 1,
                  },
                ],
              },
            ],
          },
        ],
        totalDurationSeconds: 100,
        materialsCount: 1,
      });

      const tree = await CourseModel.getTree(course.id);
      const materialId = tree!.modules[0].lessons[0].materials[0].id;

      const loginRes = await fetch("http://localhost:3000/api/v1/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "aluno.sem.acesso@teste.com",
          password: "senha-stream-123",
        }),
      });
      const cookie = loginRes.headers.get("set-cookie") || "";

      const response = await fetch(`http://localhost:3000/api/v1/stream/${materialId}`, {
        headers: { Cookie: cookie.split(";")[0] },
      });

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.name).toBe("ForbiddenError");
    });
  });
});
