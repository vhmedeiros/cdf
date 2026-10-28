const bcrypt = require("bcryptjs");
const { Client } = require("pg");

const email = process.argv[2];
const password = process.argv[3];
const displayName = process.argv[4] || "Administrador";

if (!email || !password) {
  console.error("❌ Uso: node set-admin.cjs <email> <senha> [nome]");
  process.exit(1);
}

if (password.length < 8) {
  console.error("❌ A senha deve ter no mínimo 8 caracteres.");
  process.exit(1);
}

async function run() {
  const passwordHash = await bcrypt.hash(password, 10);
  const adminFeatures = [
    "read:course",
    "create:note",
    "create:course",
    "create:invite",
    "read:course:all",
    "update:enrollment",
  ];

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    host: process.env.POSTGRES_HOST || "localhost",
    port: Number(process.env.POSTGRES_PORT || 5432),
    user: process.env.POSTGRES_USER || "local_user",
    database: process.env.POSTGRES_DB || "local_db",
    password: process.env.POSTGRES_PASSWORD || "local_password",
    ssl: process.env.POSTGRES_SSL === "true" ? { rejectUnauthorized: false } : false,
  });

  await client.connect();

  try {
    const res = await client.query(
      `INSERT INTO users (email, password, display_name, features)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET
         password = EXCLUDED.password,
         display_name = EXCLUDED.display_name,
         features = EXCLUDED.features,
         updated_at = now()
       RETURNING id, email, display_name`,
      [email.toLowerCase().trim(), passwordHash, displayName, adminFeatures],
    );

    const user = res.rows[0];
    console.log("✅ Administrador configurado com sucesso!");
    console.log(`👤 ID: ${user.id}`);
    console.log(`📧 E-mail: ${user.email}`);
    console.log(`🏷️  Nome: ${user.display_name}`);
    console.log("👉 Login liberado!");
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error("❌ Erro:", err.message);
  process.exit(1);
});
