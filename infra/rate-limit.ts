import getRedisClient from "@/infra/redis";
import { CustomError } from "@/infra/errors";

// Classe de erro específica para rate limit — retorna HTTP 429
export class TooManyRequestsError extends CustomError {
  constructor(retryAfterSeconds?: number) {
    super({
      name: "TooManyRequestsError",
      message: "Muitas tentativas. Tente novamente mais tarde.",
      action: retryAfterSeconds
        ? `Aguarde ${retryAfterSeconds} segundos antes de tentar novamente.`
        : "Aguarde alguns minutos antes de tentar novamente.",
      statusCode: 429,
    });
  }
}

// checkRateLimit: incrementa o contador no Redis para uma chave e lança
// TooManyRequestsError se o limite for atingido.
//
// Funcionamento:
//   1. INCR chave  → incrementa o contador (cria com 0 se não existir)
//   2. Se for o primeiro (count === 1), seta o TTL (expiração)
//   3. Se o contador passar do limite, lança erro
//
// Por que Redis e não Postgres?
//   Redis tem suporte nativo a expiração de chaves (TTL) e operações atômicas
//   como INCR. Perfeito para contadores temporários.
//   No Django, seria o equivalente a usar django.core.cache ou django-axes.
export async function checkRateLimit({
  key,
  maxAttempts = 5,
  windowSeconds = 15 * 60, // 15 minutos
}: {
  key: string;
  maxAttempts?: number;
  windowSeconds?: number;
}): Promise<void> {
  const redis = getRedisClient();
  const count = await redis.incr(key);

  // Só seta o TTL no primeiro incremento — para não reiniciar a janela
  // a cada tentativa (o bloqueio dura windowSeconds a partir do PRIMEIRO erro)
  if (count === 1) {
    await redis.expire(key, windowSeconds);
  }

  if (count > maxAttempts) {
    const ttl = await redis.ttl(key);
    throw new TooManyRequestsError(ttl > 0 ? ttl : undefined);
  }
}

// resetRateLimit: limpa o contador após um login bem-sucedido
export async function resetRateLimit(key: string): Promise<void> {
  const redis = getRedisClient();
  await redis.del(key);
}
