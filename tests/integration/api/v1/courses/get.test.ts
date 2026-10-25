import orchestrator from "@/tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

beforeEach(async () => {
  await orchestrator.clearDatabase();
});

describe("GET /api/v1/courses", () => {
  describe("Anonymous user", () => {
    test("Returns 401 Unauthorized", async () => {
      const response = await fetch("http://localhost:3000/api/v1/courses");
      expect(response.status).toBe(401);
    });
  });

  describe("Enrolled Student", () => {
    test("Lists only enrolled published courses", async () => {
      const { default: User } = await import("@/models/user");
      const { default: CourseModel } = await import("@/models/course");
      const { default: EnrollmentModel } = await import("@/models/enrollment");

      // 1. Cria aluno
      const student = await User.create({
        email: "aluno@teste.com",
        password: "senha-aluno-123",
        display_name: "Aluno Aluno",
        features: ["read:course"],
      });

      // 2. Cria 2 cursos: 1 matriculado, 1 não matriculado
      const course1 = await CourseModel.create({
        title: "Curso Matriculado",
        slug: "curso-matriculado",
        driveUrl: "https://drive.google.com/drive/folders/folder-1",
        driveFolderId: "folder-1",
        status: "published",
      });

      await CourseModel.create({
        title: "Curso Não Matriculado",
        slug: "curso-nao-matriculado",
        driveUrl: "https://drive.google.com/drive/folders/folder-2",
        driveFolderId: "folder-2",
        status: "published",
      });

      // Matricula aluno no curso 1
      await EnrollmentModel.create({
        userId: student.id,
        courseId: course1.id,
      });

      // 3. Login do aluno
      const loginRes = await fetch("http://localhost:3000/api/v1/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "aluno@teste.com",
          password: "senha-aluno-123",
        }),
      });
      const cookie = loginRes.headers.get("set-cookie") || "";

      // 4. Busca cursos do aluno
      const response = await fetch("http://localhost:3000/api/v1/courses", {
        headers: { Cookie: cookie.split(";")[0] },
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toHaveLength(1);
      expect(body[0].slug).toBe("curso-matriculado");
    });
  });
});

describe("GET /api/v1/courses/[slug]", () => {
  test("Returns 403 Forbidden for unenrolled student", async () => {
    const { default: User } = await import("@/models/user");
    const { default: CourseModel } = await import("@/models/course");

    await User.create({
      email: "estudante@teste.com",
      password: "senha-teste-123",
      display_name: "Estudante",
      features: ["read:course"],
    });

    await CourseModel.create({
      title: "Curso Fechado",
      slug: "curso-fechado",
      driveUrl: "https://drive.google.com/drive/folders/folder-fechado",
      driveFolderId: "folder-fechado",
      status: "published",
    });

    const loginRes = await fetch("http://localhost:3000/api/v1/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "estudante@teste.com",
        password: "senha-teste-123",
      }),
    });
    const cookie = loginRes.headers.get("set-cookie") || "";

    const response = await fetch("http://localhost:3000/api/v1/courses/curso-fechado", {
      headers: { Cookie: cookie.split(";")[0] },
    });

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.name).toBe("ForbiddenError");
  });

  test("Returns 200 with complete tree for enrolled student", async () => {
    const { default: User } = await import("@/models/user");
    const { default: CourseModel } = await import("@/models/course");
    const { default: EnrollmentModel } = await import("@/models/enrollment");

    const student = await User.create({
      email: "aluno.arvore@teste.com",
      password: "senha-teste-123",
      display_name: "Aluno Árvore",
      features: ["read:course"],
    });

    const course = await CourseModel.create({
      title: "Curso Com Árvore",
      slug: "curso-com-arvore",
      driveUrl: "https://drive.google.com/drive/folders/folder-tree",
      driveFolderId: "folder-tree",
      status: "published",
    });

    await EnrollmentModel.create({
      userId: student.id,
      courseId: course.id,
    });

    // Sincroniza uma árvore no curso
    await CourseModel.syncTreeToDatabase(course.id, {
      modules: [
        {
          rawName: "01. Módulo 1",
          title: "Módulo 1",
          position: 1,
          lessons: [
            {
              rawName: "Aula 1",
              title: "Aula 1",
              position: 1,
              durationSeconds: 1800,
              materials: [
                {
                  driveFileId: "file-v1",
                  rawName: "Video.mp4",
                  title: "Video",
                  kind: "video",
                  mime: "video/mp4",
                  sizeBytes: 100000,
                  durationSeconds: 1800,
                  position: 1,
                },
              ],
            },
          ],
        },
      ],
      totalDurationSeconds: 1800,
      materialsCount: 1,
    });

    const loginRes = await fetch("http://localhost:3000/api/v1/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "aluno.arvore@teste.com",
        password: "senha-teste-123",
      }),
    });
    const cookie = loginRes.headers.get("set-cookie") || "";

    const response = await fetch("http://localhost:3000/api/v1/courses/curso-com-arvore", {
      headers: { Cookie: cookie.split(";")[0] },
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.title).toBe("Curso Com Árvore");
    expect(body.modules).toHaveLength(1);
    expect(body.modules[0].lessons).toHaveLength(1);
    expect(body.modules[0].lessons[0].materials).toHaveLength(1);
    expect(body.modules[0].lessons[0].materials[0].kind).toBe("video");
  });
});
