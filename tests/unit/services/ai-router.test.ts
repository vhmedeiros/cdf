import AiRouter, {
  loadChainsConfig,
  canUseModel,
  recordModelUsage,
  recordModelFailure,
  executeAiChain,
  AiQuotaExhaustedError,
} from "@/services/ai/router";
import getRedisClient from "@/infra/redis";

describe("AI Router & Quota Management (services/ai/router.ts)", () => {
  const redis = getRedisClient();

  beforeEach(async () => {
    // Limpa chaves de teste do Redis
    const keys = await redis.keys("ai:*");
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  });

  afterAll(async () => {
    const keys = await redis.keys("ai:*");
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    await redis.quit();
  });

  test("Deve carregar e validar a configuração de cadeias de config/ai-chains.yaml", () => {
    const config = loadChainsConfig();
    expect(config).toBeDefined();
    expect(Array.isArray(config.deep)).toBe(true);
    expect(Array.isArray(config.bulk)).toBe(true);
    expect(Array.isArray(config.fast)).toBe(true);
    expect(Array.isArray(config.vision)).toBe(true);
    expect(config.limits["gemini-3.8-flash"]).toBeDefined();
    expect(config.limits["gemini-3.8-flash"].rpm).toBe(5);
    expect(config.limits["gemini-3.8-flash"].rpd).toBe(18);
  });

  test("Deve permitir uso de modelo quando dentro do limite de cota", async () => {
    const check = await canUseModel("gemini-3.8-flash", 1);
    expect(check.allowed).toBe(true);
  });

  test("Deve bloquear modelo quando o limite de RPM for atingido no Redis", async () => {
    const model = "gemini-3.8-flash"; // Limite RPM: 5
    const currentMinute = Math.floor(Date.now() / 60000);
    const rpmKey = `ai:quota:rpm:${model}:${currentMinute}`;

    // Simula 5 requisições já feitas no minuto
    await redis.set(rpmKey, "5");

    const check = await canUseModel(model, 1);
    expect(check.allowed).toBe(false);
    expect(check.reason).toBe("rpm_limit_reached");
  });

  test("Deve acionar circuit breaker após registrar erro 500/503", async () => {
    const model = "gemini-3.8-flash";
    await recordModelFailure(model, 503, "Service Unavailable");

    const check = await canUseModel(model, 1);
    expect(check.allowed).toBe(false);
    expect(check.reason).toBe("circuit_breaker_active");
  });

  test("Deve bloquear modelo e marcar como daily_depleted após erro de cota diária (429 RESOURCE_EXHAUSTED)", async () => {
    const model = "gemini-3.8-flash";
    await recordModelFailure(model, 429, "Quota exceeded: PerDay limit reached (RESOURCE_EXHAUSTED)");

    const check = await canUseModel(model, 1);
    expect(check.allowed).toBe(false);
    expect(check.reason).toBe("daily_quota_depleted");
  });

  test("Deve executar fallback automático para o próximo modelo da cadeia quando o primeiro estiver sem cota", async () => {
    // Esgota o primeiro modelo da cadeia 'fast' (gemini-3.1-flash-lite)
    const firstModel = "gemini-3.1-flash-lite";
    await redis.set(`ai:depleted:${firstModel}`, "true");

    // Executa a cadeia fast
    const response = await executeAiChain("fast", {
      prompt: "Explique o que é ato administrativo discricionário.",
      priority: 1,
    });

    expect(response).toBeDefined();
    // O modelo retornado deve ser o fallback (gemma-4-26b ou outro da cadeia), e NÃO o firstModel esgotado!
    expect(response.model).not.toBe(firstModel);
    expect(response.text).toContain("Resposta para o prompt");
  });

  test("Deve lançar AiQuotaExhaustedError quando todos os modelos da cadeia estiverem esgotados", async () => {
    const config = loadChainsConfig();
    const deepModels = config.deep;

    // Esgota todos os modelos da cadeia deep
    for (const m of deepModels) {
      await redis.set(`ai:depleted:${m}`, "true");
    }

    await expect(
      executeAiChain("deep", {
        prompt: "Qual é o prazo decadencial do mandado de segurança?",
      }),
    ).rejects.toThrow(AiQuotaExhaustedError);
  });
});
