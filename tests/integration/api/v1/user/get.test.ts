import orchestrator from "@/tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

beforeEach(async () => {
  await orchestrator.clearDatabase();
});

describe("GET /api/v1/user", () => {
  describe("Anonymous user", () => {
    test("Retrieving user without session returns 401", async () => {
      const response = await fetch("http://localhost:3000/api/v1/user");
      expect(response.status).toBe(401);

      const body = await response.json();
      expect(body.name).toBe("UnauthorizedError");
    });
  });

  describe("Authenticated user", () => {
    test("Retrieving currently logged-in user profile", async () => {
      const { default: User } = await import("@/models/user");
      const user = await User.create({
        email: "perfil@teste.com",
        password: "senha-segura-123",
        display_name: "Perfil Teste",
        features: ["read:course"],
      });

      // Faz login para obter o cookie de sessão
      const loginResponse = await fetch("http://localhost:3000/api/v1/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "perfil@teste.com",
          password: "senha-segura-123",
        }),
      });

      const cookieHeader = loginResponse.headers.get("set-cookie") || "";

      // Acessa o perfil com o cookie da sessão
      const response = await fetch("http://localhost:3000/api/v1/user", {
        headers: { Cookie: cookieHeader.split(";")[0] },
      });

      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.id).toBe(user.id);
      expect(body.email).toBe("perfil@teste.com");
      expect(body.display_name).toBe("Perfil Teste");
      expect(body.features).toEqual(["read:course"]);
      expect(body.password).toBeUndefined();
    });
  });
});
