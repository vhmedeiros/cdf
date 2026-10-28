import fs from "node:fs";
import path from "node:path";
import yaml from "yaml";
import { z } from "zod";
import getRedisClient from "@/infra/redis";
import { CustomError, ValidationError } from "@/infra/errors";

export class AiQuotaExhaustedError extends CustomError {
  constructor(message: string = "Todos os modelos de IA da cadeia estão temporariamente sem cota.") {
    super({
      name: "AiQuotaExhaustedError",
      message,
      action: "Aguarde a renovação da cota por minuto ou o reinício diário.",
      statusCode: 429,
    });
  }
}

// Schema de validação do arquivo de cadeias
const ModelLimitSchema = z.object({
  rpm: z.number().int().positive(),
  rpd: z.number().int().positive(),
  tpm: z.number().int().positive().optional(),
});

const ChainsConfigSchema = z.object({
  deep: z.array(z.string()).min(1),
  bulk: z.array(z.string()).min(1),
  fast: z.array(z.string()).min(1),
  vision: z.array(z.string()).min(1),
  limits: z.record(ModelLimitSchema),
  min_tier: z.record(z.string()).optional(),
});

export type ChainName = "deep" | "bulk" | "fast" | "vision";

export interface AiRequestOptions {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  jsonSchema?: any;
  priority?: 1 | 2 | 3 | 4; // 1: imediato aluno, 2: extração prova, 3: segundo plano, 4: relatórios
  taskType?: string;
}

export interface AiResponse {
  text: string;
  model: string;
  tokens_in: number;
  tokens_out: number;
}

let cachedConfig: z.infer<typeof ChainsConfigSchema> | null = null;

export function loadChainsConfig(): z.infer<typeof ChainsConfigSchema> {
  if (cachedConfig) return cachedConfig;

  const configPath =
    process.env.AI_CHAINS_FILE || path.join(process.cwd(), "config", "ai-chains.yaml");

  if (!fs.existsSync(configPath)) {
    throw new Error(`Arquivo de configuração de IA não encontrado em: ${configPath}`);
  }

  const raw = fs.readFileSync(configPath, "utf-8");
  const parsed = yaml.parse(raw);
  cachedConfig = ChainsConfigSchema.parse(parsed);
  return cachedConfig;
}

// Reseta o cache de configuração (útil para testes unitários)
export function _resetCachedConfigForTests(): void {
  cachedConfig = null;
}

/**
 * Verifica se um modelo específico tem cota disponível no Redis e está saudável
 */
export async function canUseModel(
  model: string,
  priority: number = 1,
): Promise<{ allowed: boolean; reason?: string }> {
  const config = loadChainsConfig();
  const limits = config.limits[model];

  // Modelos locais ou sem limites configurados são sempre liberados
  if (!limits || model === "local") {
    return { allowed: true };
  }

  const redis = getRedisClient();

  // 1. Verifica Circuit Breaker (erro 500/503 recente)
  const circuitBreaker = await redis.get(`ai:circuit_breaker:${model}`);
  if (circuitBreaker) {
    return { allowed: false, reason: "circuit_breaker_active" };
  }

  // 2. Verifica se a cota diária (RPD) já foi esgotada
  const isDepleted = await redis.get(`ai:depleted:${model}`);
  if (isDepleted) {
    return { allowed: false, reason: "daily_quota_depleted" };
  }

  const now = new Date();
  const currentMinute = Math.floor(now.getTime() / 60000);
  const currentDate = now.toISOString().slice(0, 10);

  const rpmKey = `ai:quota:rpm:${model}:${currentMinute}`;
  const rpdKey = `ai:quota:rpd:${model}:${currentDate}`;

  const [rpmCountStr, rpdCountStr] = await Promise.all([redis.get(rpmKey), redis.get(rpdKey)]);

  const rpmCount = parseInt(rpmCountStr || "0", 10);
  const rpdCount = parseInt(rpdCountStr || "0", 10);

  // 3. Limite por minuto
  if (rpmCount >= limits.rpm) {
    return { allowed: false, reason: "rpm_limit_reached" };
  }

  // 4. Limite diário: Prioridades 3 e 4 não consomem os últimos 20% da cota diária
  const rpdThreshold = priority >= 3 ? Math.floor(limits.rpd * 0.8) : limits.rpd;

  if (rpdCount >= rpdThreshold) {
    return { allowed: false, reason: "rpd_limit_reached" };
  }

  return { allowed: true };
}

/**
 * Incrementa os contadores de cota no Redis para o modelo consumido
 */
export async function recordModelUsage(model: string): Promise<void> {
  const redis = getRedisClient();
  const now = new Date();
  const currentMinute = Math.floor(now.getTime() / 60000);
  const currentDate = now.toISOString().slice(0, 10);

  const rpmKey = `ai:quota:rpm:${model}:${currentMinute}`;
  const rpdKey = `ai:quota:rpd:${model}:${currentDate}`;

  const pipe = redis.pipeline();
  pipe.incr(rpmKey);
  pipe.expire(rpmKey, 120); // 2 minutos de TTL
  pipe.incr(rpdKey);
  pipe.expire(rpdKey, 48 * 3600); // 48 horas de TTL
  await pipe.exec();
}

/**
 * Registra falhas da API do Google (429 ou 500) para acionar circuit breaker ou esgotamento
 */
export async function recordModelFailure(
  model: string,
  statusCode: number,
  errorMessage: string = "",
): Promise<void> {
  const redis = getRedisClient();

  if (statusCode === 429) {
    const isDailyExhausted =
      errorMessage.toLowerCase().includes("perday") ||
      errorMessage.toLowerCase().includes("daily") ||
      errorMessage.toLowerCase().includes("resource_exhausted");

    if (isDailyExhausted) {
      // Bloqueia até a meia-noite (24h de TTL)
      await redis.set(`ai:depleted:${model}`, "true", "EX", 24 * 3600);
    } else {
      // Bloqueio curto de 60 segundos por limite de RPM
      const currentMinute = Math.floor(Date.now() / 60000);
      const rpmKey = `ai:quota:rpm:${model}:${currentMinute}`;
      await redis.set(rpmKey, "9999", "EX", 60);
    }
  } else if (statusCode >= 500) {
    // Circuit breaker de 5 minutos (300 segundos)
    await redis.set(`ai:circuit_breaker:${model}`, "true", "EX", 300);
  }
}

/**
 * Executa uma chamada à IA percorrendo a cadeia solicitada e fazendo fallback automático
 */
export async function executeAiChain(
  chainName: ChainName,
  options: AiRequestOptions,
): Promise<AiResponse> {
  const config = loadChainsConfig();
  const chainModels = config[chainName];

  if (!chainModels || chainModels.length === 0) {
    throw new Error(`Cadeia de IA '${chainName}' não possui modelos configurados.`);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const isTestEnv = process.env.NODE_ENV === "test";

  let lastError: any = null;

  for (const model of chainModels) {
    // 1. Verifica disponibilidade de cota no Redis
    const check = await canUseModel(model, options.priority || 1);
    if (!check.allowed) {
      continue;
    }

    try {
      // Modo Mock para Testes Automatizados
      if (isTestEnv && !apiKey) {
        await recordModelUsage(model);
        return {
          text: `[Mock AI Response from ${model}]: Resposta para o prompt: ${options.prompt.slice(0, 30)}...`,
          model,
          tokens_in: 15,
          tokens_out: 25,
        };
      }

      if (!apiKey) {
        throw new Error("GEMINI_API_KEY não configurada no ambiente.");
      }

      // 2. Chamada HTTP para a API oficial do Google Gemini
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const contents: any[] = [];
      if (options.systemPrompt) {
        contents.push({ role: "system", parts: [{ text: options.systemPrompt }] });
      }
      contents.push({ role: "user", parts: [{ text: options.prompt }] });

      const generationConfig: any = {
        temperature: options.temperature ?? 0.2,
      };

      if (options.maxTokens) {
        generationConfig.maxOutputTokens = options.maxTokens;
      }

      if (options.jsonSchema) {
        generationConfig.responseMimeType = "application/json";
        generationConfig.responseSchema = options.jsonSchema;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents, generationConfig }),
        signal: AbortSignal.timeout(30_000), // Timeout de 30 segundos
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData?.error?.message || response.statusText;

        if (response.status === 400) {
          // Erro no payload/prompt: não adianta tentar outros modelos
          throw new ValidationError({
            message: `Erro na validação do prompt de IA: ${errorMsg}`,
          });
        }

        // 429 ou 5xx: registra falha no Redis e tenta o próximo da cadeia
        await recordModelFailure(model, response.status, errorMsg);
        lastError = new Error(`Model ${model} returned ${response.status}: ${errorMsg}`);
        continue;
      }

      // Resposta bem-sucedida (200 OK)
      await recordModelUsage(model);

      const data = await response.json();
      const candidateText =
        data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const tokensIn = data?.usageMetadata?.promptTokenCount || 0;
      const tokensOut = data?.usageMetadata?.candidatesTokenCount || 0;

      return {
        text: candidateText,
        model,
        tokens_in: tokensIn,
        tokens_out: tokensOut,
      };
    } catch (err: any) {
      if (err instanceof ValidationError) throw err;
      lastError = err;
      continue;
    }
  }

  // Se todos os modelos da cadeia falharam ou estavam sem cota
  throw new AiQuotaExhaustedError(
    `Todos os modelos da cadeia '${chainName}' esgotaram sua cota ou falharam. Último erro: ${lastError?.message || "Sem modelos disponíveis"}`,
  );
}

const AiRouter = {
  loadChainsConfig,
  canUseModel,
  recordModelUsage,
  recordModelFailure,
  executeAiChain,
};

export default AiRouter;
