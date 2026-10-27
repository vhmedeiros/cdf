import orchestrator from "@/tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

describe("Student Dashboard Home Page (/)", () => {
  test("GET / renders the student dashboard shell (HTTP 200)", async () => {
    const response = await fetch("http://localhost:3000/");
    expect(response.status).toBe(200);

    const html = await response.text();
    expect(html).toContain("Aula");
    expect(html).toContain("Biblioteca Noturna");
    expect(html).toContain("Revisões Espaçadas de Hoje");
    expect(html).toContain("Mapa de Calor de Estudos");
  });
});
