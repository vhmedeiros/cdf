import orchestrator from "@/tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

beforeEach(async () => {
  await orchestrator.clearDatabase();
});

describe("GET /api/v1/categories", () => {
  test("Returns 401 Unauthorized for anonymous user", async () => {
    const response = await fetch("http://localhost:3000/api/v1/categories");
    expect(response.status).toBe(401);
  });

  test("Returns seeded categories for authenticated user", async () => {
    const { default: User } = await import("@/models/user");

    await User.create({
      email: "aluno.categorias@teste.com",
      password: "senha-teste-123",
      display_name: "Aluno Categorias",
      features: ["read:course"],
    });

    const loginRes = await fetch("http://localhost:3000/api/v1/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "aluno.categorias@teste.com",
        password: "senha-teste-123",
      }),
    });
    const cookie = loginRes.headers.get("set-cookie") || "";

    const response = await fetch("http://localhost:3000/api/v1/categories", {
      headers: { Cookie: cookie.split(";")[0] },
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.map((category: { slug: string }) => category.slug)).toEqual(
      expect.arrayContaining(["enem", "concursos", "programacao", "ingles", "outros"]),
    );
  });
});
