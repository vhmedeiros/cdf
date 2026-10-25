import orchestrator from "@/tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

beforeEach(async () => {
  // Cada teste começa com o banco limpo — testes isolados e previsíveis
  await orchestrator.clearDatabase();
});

describe("POST /api/v1/sessions", () => {
  describe("Anonymous user", () => {
    test("With valid credentials", async () => {
      // 1. Cria um usuário diretamente no banco (sem passar pela API de convite)
      await fetch("http://localhost:3000/api/v1/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Por ora usamos o endpoint direto; na Fase 1 completa será via convite
        body: JSON.stringify({
          email: "usuario@teste.com",
          features: ["read:course"],
        }),
      });

      // Cria o usuário via model direto (para não depender do fluxo de convite no teste de login)
      const { default: User } = await import("@/models/user");
      await User.create({
        email: "login@teste.com",
        password: "senha-segura-123",
        display_name: "Usuário de Teste",
        features: ["read:course"],
      });

      // 2. Tenta fazer login
      const response = await fetch("http://localhost:3000/api/v1/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "login@teste.com",
          password: "senha-segura-123",
        }),
      });

      // 3. Verifica a resposta
      expect(response.status).toBe(201);

      const body = await response.json();
      expect(body.email).toBe("login@teste.com");
      expect(body.display_name).toBe("Usuário de Teste");
      expect(body.password).toBeUndefined(); // nunca retorna a senha!

      // 4. Verifica se o cookie foi setado
      const setCookie = response.headers.get("set-cookie");
      expect(setCookie).toContain("session_id=");
      expect(setCookie).toContain("HttpOnly");
    });

    test("With invalid password", async () => {
      const { default: User } = await import("@/models/user");
      await User.create({
        email: "login@teste.com",
        password: "senha-correta",
        display_name: "Teste",
        features: [],
      });

      const response = await fetch("http://localhost:3000/api/v1/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "login@teste.com",
          password: "senha-errada",
        }),
      });

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.name).toBe("NotFoundError");
    });

    test("With non-existent email", async () => {
      const response = await fetch("http://localhost:3000/api/v1/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "naoexiste@teste.com",
          password: "qualquer-senha",
        }),
      });

      expect(response.status).toBe(401);
    });

    test("With invalid email format", async () => {
      const response = await fetch("http://localhost:3000/api/v1/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "email-invalido",
          password: "qualquer-senha",
        }),
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.name).toBe("ValidationError");
    });

    test("Blocks after 5 failed attempts (rate limit)", async () => {
      const { default: User } = await import("@/models/user");
      await User.create({
        email: "alvo@teste.com",
        password: "senha-correta",
        display_name: "Alvo",
        features: [],
      });

      // 5 tentativas com senha errada
      for (let i = 0; i < 5; i++) {
        await fetch("http://localhost:3000/api/v1/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "alvo@teste.com", password: "errada" }),
        });
      }

      // 6ª tentativa — deve ser bloqueada
      const response = await fetch("http://localhost:3000/api/v1/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "alvo@teste.com", password: "errada" }),
      });

      expect(response.status).toBe(429);
      const body = await response.json();
      expect(body.name).toBe("TooManyRequestsError");
    });
  });
});

describe("DELETE /api/v1/sessions", () => {
  test("Logs out successfully", async () => {
    const { default: User } = await import("@/models/user");
    await User.create({
      email: "logout@teste.com",
      password: "senha123456",
      display_name: "Logout",
      features: [],
    });

    // Faz login para obter o cookie
    const loginResponse = await fetch("http://localhost:3000/api/v1/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "logout@teste.com",
        password: "senha123456",
      }),
    });

    const cookieHeader = loginResponse.headers.get("set-cookie") || "";

    // Faz logout enviando o cookie
    const logoutResponse = await fetch("http://localhost:3000/api/v1/sessions", {
      method: "DELETE",
      headers: { Cookie: cookieHeader.split(";")[0] },
    });

    expect(logoutResponse.status).toBe(200);

    // Verifica que o cookie foi removido (expires no passado)
    const setCookie = logoutResponse.headers.get("set-cookie");
    expect(setCookie).toContain("session_id=;");
  });
});
