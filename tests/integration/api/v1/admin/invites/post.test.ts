import orchestrator from "@/tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

beforeEach(async () => {
  await orchestrator.clearDatabase();
});

describe("POST /api/v1/admin/invites", () => {
  describe("Anonymous user", () => {
    test("Attempting to create invite without session returns 401", async () => {
      const response = await fetch("http://localhost:3000/api/v1/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "convidado@teste.com",
        }),
      });

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.name).toBe("UnauthorizedError");
    });
  });

  describe("Student user (without create:invite feature)", () => {
    test("Student gets 403 Forbidden", async () => {
      const { default: User } = await import("@/models/user");
      await User.create({
        email: "aluno@teste.com",
        password: "senha-aluno-123",
        display_name: "Aluno Comum",
        features: ["read:course"], // Aluno tem apenas read:course
      });

      // Login como aluno
      const loginResponse = await fetch("http://localhost:3000/api/v1/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "aluno@teste.com",
          password: "senha-aluno-123",
        }),
      });

      const cookieHeader = loginResponse.headers.get("set-cookie") || "";

      // Tenta criar convite
      const response = await fetch("http://localhost:3000/api/v1/admin/invites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookieHeader.split(";")[0],
        },
        body: JSON.stringify({
          email: "convidado@teste.com",
        }),
      });

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.name).toBe("ForbiddenError");
    });
  });

  describe("Admin user (with create:invite feature)", () => {
    test("Admin creates invite successfully", async () => {
      const { default: User } = await import("@/models/user");
      await User.create({
        email: "admin@teste.com",
        password: "senha-admin-123",
        display_name: "Admin do Sistema",
        features: ["create:invite"],
      });

      // Login como admin
      const loginResponse = await fetch("http://localhost:3000/api/v1/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "admin@teste.com",
          password: "senha-admin-123",
        }),
      });

      const cookieHeader = loginResponse.headers.get("set-cookie") || "";

      // Cria convite
      const response = await fetch("http://localhost:3000/api/v1/admin/invites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookieHeader.split(";")[0],
        },
        body: JSON.stringify({
          email: "novo.aluno@teste.com",
          features: ["read:course", "create:note"],
        }),
      });

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.email).toBe("novo.aluno@teste.com");
      expect(body.token).toBeDefined();
      expect(body.features).toEqual(["read:course", "create:note"]);
    });
  });
});
