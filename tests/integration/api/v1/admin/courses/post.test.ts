import orchestrator from "@/tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

beforeEach(async () => {
  await orchestrator.clearDatabase();
});

describe("POST /api/v1/admin/courses", () => {
  test("Student user without create:course gets 403 Forbidden", async () => {
    const { default: User } = await import("@/models/user");
    await User.create({
      email: "estudante.bloqueado@teste.com",
      password: "senha-segura-123",
      display_name: "Estudante",
      features: ["read:course"],
    });

    const loginRes = await fetch("http://localhost:3000/api/v1/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "estudante.bloqueado@teste.com",
        password: "senha-segura-123",
      }),
    });
    const cookie = loginRes.headers.get("set-cookie") || "";

    const response = await fetch("http://localhost:3000/api/v1/admin/courses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie.split(";")[0],
      },
      body: JSON.stringify({
        title: "Novo Curso Tentativa",
        slug: "novo-curso",
        drive_url: "https://drive.google.com/drive/folders/pasta-123",
      }),
    });

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.name).toBe("ForbiddenError");
  });

  test("Admin user creates a course successfully", async () => {
    const { default: User } = await import("@/models/user");
    await User.create({
      email: "admin.cursos@teste.com",
      password: "senha-admin-123",
      display_name: "Admin Cursos",
      features: ["create:course"],
    });

    const loginRes = await fetch("http://localhost:3000/api/v1/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin.cursos@teste.com",
        password: "senha-admin-123",
      }),
    });
    const cookie = loginRes.headers.get("set-cookie") || "";

    const response = await fetch("http://localhost:3000/api/v1/admin/courses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie.split(";")[0],
      },
      body: JSON.stringify({
        title: "Direito Administrativo Avançado",
        slug: "direito-administrativo",
        drive_url: "https://drive.google.com/drive/u/0/folders/pasta-adm-456?usp=sharing",
        description: "Curso focado em jurisprudência.",
        lesson_strategy: "auto",
      }),
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.title).toBe("Direito Administrativo Avançado");
    expect(body.slug).toBe("direito-administrativo");
    expect(body.drive_folder_id).toBe("pasta-adm-456");
    // Cursos nascem como rascunho; o sync e a publicação acontecem depois.
    expect(body.status).toBe("draft");
  });

  test("Rejects a file link and does not create a course", async () => {
    const { default: User } = await import("@/models/user");
    const { default: CourseModel } = await import("@/models/course");

    await User.create({
      email: "admin.arquivo@teste.com",
      password: "senha-admin-123",
      display_name: "Admin Arquivo",
      features: ["create:course"],
    });

    const loginRes = await fetch("http://localhost:3000/api/v1/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin.arquivo@teste.com",
        password: "senha-admin-123",
      }),
    });
    const cookie = loginRes.headers.get("set-cookie") || "";

    const response = await fetch("http://localhost:3000/api/v1/admin/courses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie.split(";")[0],
      },
      body: JSON.stringify({
        title: "Curso com Link de Arquivo",
        slug: "curso-link-arquivo",
        drive_url: "https://drive.google.com/file/d/1a2b3c4d5e/view?usp=sharing",
      }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.name).toBe("ValidationError");

    const courses = await CourseModel.findAll();
    expect(courses.find((course) => course.slug === "curso-link-arquivo")).toBeUndefined();
  });
});

describe("Admin enrollments", () => {
  test("Admin enrolls a student in a course", async () => {
    const { default: User } = await import("@/models/user");
    const { default: CourseModel } = await import("@/models/course");

    const admin = await User.create({
      email: "admin.matricula@teste.com",
      password: "senha-admin-123",
      display_name: "Admin Matrícula",
      features: ["create:course"],
    });

    const student = await User.create({
      email: "aluno.matricula@teste.com",
      password: "senha-aluno-123",
      display_name: "Aluno Matrícula",
      features: ["read:course"],
    });

    const course = await CourseModel.create({
      title: "Curso Matrícula Teste",
      slug: "curso-matricula-teste",
      driveUrl: "https://drive.google.com/drive/folders/pasta-789",
      driveFolderId: "pasta-789",
    });

    const loginRes = await fetch("http://localhost:3000/api/v1/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin.matricula@teste.com",
        password: "senha-admin-123",
      }),
    });
    const cookie = loginRes.headers.get("set-cookie") || "";

    const response = await fetch("http://localhost:3000/api/v1/admin/enrollments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie.split(";")[0],
      },
      body: JSON.stringify({
        user_id: student.id,
        course_id: course.id,
      }),
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.user_id).toBe(student.id);
    expect(body.course_id).toBe(course.id);
  });
});
