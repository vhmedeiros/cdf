import orchestrator from "@/tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

beforeEach(async () => {
  await orchestrator.clearDatabase();
});

async function createUserAndLogin() {
  const { default: User } = await import("@/models/user");

  await User.create({
    email: "senha@teste.com",
    password: "senha-atual-123",
    display_name: "Usuário Senha",
    features: ["read:course"],
  });

  const loginRes = await fetch("http://localhost:3000/api/v1/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "senha@teste.com", password: "senha-atual-123" }),
  });

  const cookie = loginRes.headers.get("set-cookie") || "";
  return cookie.split(";")[0];
}

function changePasswordRequest(cookie: string, body: Record<string, string>) {
  return fetch("http://localhost:3000/api/v1/user/password", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/v1/user/password", () => {
  test("Requires authentication", async () => {
    const response = await changePasswordRequest("", {
      current_password: "senha-atual-123",
      new_password: "nova-senha-456",
    });

    expect(response.status).toBe(401);
  });

  test("Requires the current password", async () => {
    const cookie = await createUserAndLogin();

    const response = await changePasswordRequest(cookie, {
      new_password: "nova-senha-456",
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.name).toBe("ValidationError");
  });

  test("Rejects a wrong current password", async () => {
    const cookie = await createUserAndLogin();

    const response = await changePasswordRequest(cookie, {
      current_password: "senha-errada-000",
      new_password: "nova-senha-456",
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.name).toBe("ValidationError");
  });

  test("Rejects a new password equal to the current one", async () => {
    const cookie = await createUserAndLogin();

    const response = await changePasswordRequest(cookie, {
      current_password: "senha-atual-123",
      new_password: "senha-atual-123",
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.name).toBe("ValidationError");
  });

  test("Changes the password and allows login with the new one", async () => {
    const cookie = await createUserAndLogin();

    const response = await changePasswordRequest(cookie, {
      current_password: "senha-atual-123",
      new_password: "nova-senha-456",
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toBe("Senha atualizada com sucesso!");

    const oldLogin = await fetch("http://localhost:3000/api/v1/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "senha@teste.com", password: "senha-atual-123" }),
    });
    expect(oldLogin.status).toBe(401);

    const newLogin = await fetch("http://localhost:3000/api/v1/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "senha@teste.com", password: "nova-senha-456" }),
    });
    expect(newLogin.status).toBe(201);
  });
});
