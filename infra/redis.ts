import { Redis } from "ioredis";

// ioredis é a biblioteca mais usada para Redis no Node.js
// Assim como psycopg2 é para o PostgreSQL, ioredis é para o Redis

// Criamos apenas UMA instância e reutilizamos — o padrão Singleton
// (o mesmo que o pool do pg em infra/database.ts)
let redis: Redis;

function getRedisClient(): Redis {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
      // Em caso de falha na conexão, tenta reconectar com backoff exponencial
      retryStrategy: (times) => {
        const delay = Math.min(times * 100, 3000);
        return delay;
      },
      // Evita erros não tratados no processo quando a conexão falha
      lazyConnect: false,
    });

    redis.on("error", (error) => {
      console.error("Redis connection error:", error);
    });
  }

  return redis;
}

export default getRedisClient;
