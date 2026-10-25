import orchestrator from "@/tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

describe("Pages /courses and /courses/[slug]", () => {
  test("GET /courses renders the courses list page shell (HTTP 200)", async () => {
    const response = await fetch("http://localhost:3000/courses");
    expect(response.status).toBe(200);

    const html = await response.text();
    expect(html).toContain("Meus Cursos");
    expect(html).toContain("Biblioteca Noturna");
  });

  test("GET /courses/[slug] renders the classroom page shell (HTTP 200)", async () => {
    const response = await fetch("http://localhost:3000/courses/direito-constitucional");
    expect(response.status).toBe(200);

    const html = await response.text();
    expect(html).toContain("Aula");
    expect(html).toContain("text-[#ece9e2]");
    expect(html).toContain("Visão Geral");
  });
});
