import orchestrator from "@/tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

beforeEach(async () => {
  await orchestrator.clearDatabase();
});

const LOGIN_URL = "http://localhost:3000/api/v1/sessions";
const ALLOWED_ORIGIN = "http://localhost:3000";

async function postLogin(headers: Record<string, string>) {
  return fetch(LOGIN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify({
      email: "origem@teste.com",
      password: "senha-origem-123",
    }),
  });
}

describe("Origin/CSRF nas mutações", () => {
  test("Rejeita mutação com Origin externo", async () => {
    const response = await postLogin({ Origin: "https://evil.example" });

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.name).toBe("ForbiddenError");
  });

  test("Rejeita mutação com Referer externo quando não há Origin", async () => {
    const response = await postLogin({ Referer: "https://evil.example/login" });

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.name).toBe("ForbiddenError");
  });

  test("Aceita mutação com Origin da plataforma", async () => {
    const response = await postLogin({ Origin: ALLOWED_ORIGIN });

    // A origem passou; a requisição segue para o handler e falha por credenciais inválidas.
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.name).toBe("UnauthorizedError");
  });

  test("Aceita mutação com Referer da plataforma quando não há Origin", async () => {
    const response = await postLogin({ Referer: `${ALLOWED_ORIGIN}/login` });

    expect(response.status).toBe(401);
  });

  test("Permite clientes não-browser sem Origin e sem Referer", async () => {
    const response = await postLogin({});

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.name).toBe("UnauthorizedError");
  });
});
