import orchestrator from "@/tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

beforeEach(async () => {
  await orchestrator.clearDatabase();
});

describe("Preferences API (/api/v1/me/preferences)", () => {
  describe("Anonymous user", () => {
    test("Receives 401 Unauthorized", async () => {
      const response = await fetch("http://localhost:3000/api/v1/me/preferences");
      expect(response.status).toBe(401);
    });
  });

  describe("Authenticated user", () => {
    test("Returns default preferences and updates them successfully", async () => {
      const { default: User } = await import("@/models/user");
      const { default: Session } = await import("@/models/session");

      const user = await User.create({
        email: "usuario.pref@teste.com",
        password: "senha-pref-123",
        display_name: "Usuario Preferencias",
        features: ["read:course"],
      });
      const session = await Session.create(user.id);

      // 1. Obtém preferências padrão
      const getRes = await fetch("http://localhost:3000/api/v1/me/preferences", {
        headers: { Cookie: `session_id=${session.token}` },
      });
      expect(getRes.status).toBe(200);
      const defaults = await getRes.json();
      expect(defaults.pomodoro_focus_minutes).toBe(25);
      expect(defaults.pomodoro_short_break_minutes).toBe(5);
      expect(defaults.playback_rate).toBe(1.0);
      expect(defaults.volume).toBe(1.0);

      // 2. Atualiza preferências
      const patchRes = await fetch("http://localhost:3000/api/v1/me/preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify({
          pomodoro_focus_minutes: 45,
          pomodoro_short_break_minutes: 10,
          playback_rate: 1.5,
          theater_mode: true,
        }),
      });

      expect(patchRes.status).toBe(200);
      const updated = await patchRes.json();
      expect(updated.pomodoro_focus_minutes).toBe(45);
      expect(updated.pomodoro_short_break_minutes).toBe(10);
      expect(updated.playback_rate).toBe(1.5);
      expect(updated.theater_mode).toBe(true);

      // 3. Garante que persistiu buscando novamente
      const verifyRes = await fetch("http://localhost:3000/api/v1/me/preferences", {
        headers: { Cookie: `session_id=${session.token}` },
      });
      const verified = await verifyRes.json();
      expect(verified.pomodoro_focus_minutes).toBe(45);
      expect(verified.playback_rate).toBe(1.5);
    });
  });
});
