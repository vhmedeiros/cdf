import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";
import bcrypt from "bcryptjs";
import database from "@/infra/database";

dotenvExpand.expand(dotenv.config({ path: ".env.production" }));
if (!process.env.DATABASE_URL) {
  dotenvExpand.expand(dotenv.config({ path: ".env.development" }));
}

async function setAdmin() {
  const email = process.argv[2];
  const password = process.argv[3];
  const displayName = process.argv[4] || "Administrador";

  if (!email || !password) {
    console.error("❌ Uso: npx tsx infra/scripts/set-admin.ts <email> <senha> [nome]");
    console.error(
      "Exemplo: npx tsx infra/scripts/set-admin.ts victor@email.com MinhaSenha123 'Victor Medeiros'",
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("❌ A senha deve ter no mínimo 8 caracteres.");
    process.exit(1);
  }

  console.log(`🔐 Configurando usuário administrador: ${email}...`);

  const passwordHash = await bcrypt.hash(password, 10);
  const adminFeatures = [
    "read:course",
    "create:note",
    "create:course",
    "create:invite",
    "read:course:all",
    "update:enrollment",
  ];

  const client = await database.getNewClient();

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
    console.log(`✅ Administrador configurado com sucesso!`);
    console.log(`👤 ID: ${user.id}`);
    console.log(`📧 E-mail: ${user.email}`);
    console.log(`🏷️  Nome: ${user.display_name}`);
    console.log(
      `👉 Agora você já pode fazer login com essas credenciais em https://aula.vhmedeiros.dev.br/login`,
    );
  } finally {
    await client.end();
  }
}

setAdmin().catch((err) => {
  console.error("❌ Erro ao configurar admin:", err);
  process.exit(1);
});
