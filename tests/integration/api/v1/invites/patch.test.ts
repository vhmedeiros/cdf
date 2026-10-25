import orchestrator from "@/tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

beforeEach(async () => {
  await orchestrator.clearDatabase();
});

describe("PATCH /api/v1/invites/[token]", () => {
  describe("Anonymous user", () => {
    test("Accepts invite and creates account", async () => {
      // 1. Precisa de um admin para criar o convite — cria diretamente no banco
      const { default: User } = await import("@/models/user");
      const admin = await User.create({
        email: "admin@teste.com",
        password: "senha-admin",
        display_name: "Admin",
        features: ["create:invite"],
      });

      const { default: Invite } = await import("@/models/invite");
      const invite = await Invite.create({
        email: "novo@usuario.com",
        features: ["read:course"],
        createdBy: admin.id,
      });

      // 2. Aceita o convite
      const response = await fetch(`http://localhost:3000/api/v1/invites/${invite.token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: "Novo Usuário",
          password: "senha-nova-123",
        }),
      });

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.email).toBe("novo@usuario.com");
      expect(body.features).toContain("read:course");

      // Deve ter setado o cookie (já logou o usuário)
      expect(response.headers.get("set-cookie")).toContain("session_id=");
    });

    test("Rejects already-used invite", async () => {
      const { default: User } = await import("@/models/user");
      const admin = await User.create({
        email: "admin@teste.com",
        password: "senha-admin",
        display_name: "Admin",
        features: ["create:invite"],
      });

      const { default: Invite } = await import("@/models/invite");
      const invite = await Invite.create({
        email: "usado@usuario.com",
        features: [],
        createdBy: admin.id,
      });

      // Usa o convite pela primeira vez
      await fetch(`http://localhost:3000/api/v1/invites/${invite.token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: "Primeiro",
          password: "senha-nova-123",
        }),
      });

      // Tenta usar o convite de novo — deve falhar com 410 Gone
      const response = await fetch(`http://localhost:3000/api/v1/invites/${invite.token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: "Segundo",
          password: "outra-senha-123",
        }),
      });

      expect(response.status).toBe(410);
      const body = await response.json();
      expect(body.name).toBe("GoneError");
    });

    test("Rejects invalid token", async () => {
      const response = await fetch(
        "http://localhost:3000/api/v1/invites/token-invalido-que-nao-existe",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            display_name: "Qualquer",
            password: "senha-nova-123",
          }),
        },
      );

      expect(response.status).toBe(404);
    });
  });
});
