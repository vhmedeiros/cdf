import orchestrator from "@/tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

beforeEach(async () => {
  await orchestrator.clearDatabase();
});

describe("POST /api/v1/password-resets", () => {
  describe("Anonymous user", () => {
    test("Requesting password reset for existing user", async () => {
      const { default: User } = await import("@/models/user");
      await User.create({
        email: "esqueceu@teste.com",
        password: "senha-antiga-123",
        display_name: "Esquecido",
        features: ["read:course"],
      });

      const response = await fetch("http://localhost:3000/api/v1/password-resets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "esqueceu@teste.com",
        }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toBeDefined();
      expect(body.token).toBeDefined();
    });

    test("Requesting password reset for non-existent email does not reveal account existence", async () => {
      const response = await fetch("http://localhost:3000/api/v1/password-resets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "fantasma@teste.com",
        }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toBeDefined();
      expect(body.token).toBeUndefined();
    });

    test("Requesting password reset with invalid email returns 400", async () => {
      const response = await fetch("http://localhost:3000/api/v1/password-resets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "email-invalido",
        }),
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.name).toBe("ValidationError");
    });
  });
});

describe("PATCH /api/v1/password-resets/[token]", () => {
  test("Successfully resets password, logs in with new password, and old password fails", async () => {
    const { default: User } = await import("@/models/user");
    await User.create({
      email: "alterar@teste.com",
      password: "senha-antiga-123",
      display_name: "Alterar Senha",
      features: ["read:course"],
    });

    // 1. Solicita redefinição
    const resetReqResponse = await fetch("http://localhost:3000/api/v1/password-resets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "alterar@teste.com" }),
    });
    const { token } = await resetReqResponse.json();

    // 2. Redefine a senha com o token
    const patchResponse = await fetch(`http://localhost:3000/api/v1/password-resets/${token}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "senha-nova-999" }),
    });

    expect(patchResponse.status).toBe(200);
    const patchBody = await patchResponse.json();
    expect(patchBody.message).toContain("sucesso");

    // 3. Tenta login com a senha ANTIGA (deve falhar)
    const oldLoginResponse = await fetch("http://localhost:3000/api/v1/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "alterar@teste.com",
        password: "senha-antiga-123",
      }),
    });
    expect(oldLoginResponse.status).toBe(401);

    // 4. Tenta login com a senha NOVA (deve funcionar)
    const newLoginResponse = await fetch("http://localhost:3000/api/v1/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "alterar@teste.com",
        password: "senha-nova-999",
      }),
    });
    expect(newLoginResponse.status).toBe(201);
  });

  test("Rejects already-used token with 410 Gone", async () => {
    const { default: User } = await import("@/models/user");
    await User.create({
      email: "reuso@teste.com",
      password: "senha-inicial-123",
      display_name: "Reuso",
      features: [],
    });

    const resetReqResponse = await fetch("http://localhost:3000/api/v1/password-resets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "reuso@teste.com" }),
    });
    const { token } = await resetReqResponse.json();

    // Usa na primeira vez
    await fetch(`http://localhost:3000/api/v1/password-resets/${token}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "senha-nova-1234" }),
    });

    // Tenta reusar o mesmo token
    const reattemptResponse = await fetch(`http://localhost:3000/api/v1/password-resets/${token}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "outra-senha-9999" }),
    });

    expect(reattemptResponse.status).toBe(410);
    const body = await reattemptResponse.json();
    expect(body.name).toBe("GoneError");
  });

  test("Rejects invalid token with 404 NotFound", async () => {
    const response = await fetch("http://localhost:3000/api/v1/password-resets/token-inexistente", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "senha-qualquer-12" }),
    });

    expect(response.status).toBe(404);
  });
});
