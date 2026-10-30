const fs = require("node:fs");
const path = require("node:path");
const { GoogleAuth } = require("google-auth-library");

const candidates = [
  process.env.GOOGLE_SA_FILE,
  "/run/secrets/gdrive_sa.json",
  path.join(process.cwd(), "secrets", "gdrive_sa.json"),
  path.join(process.cwd(), "gdrive_sa.json"),
  "/app/secrets/gdrive_sa.json",
  "/app/gdrive_sa.json",
].filter(Boolean);

console.log("🔍 Verificando arquivo de credenciais da Service Account do Google Drive...\n");

let foundPath = null;
for (const p of candidates) {
  const exists = fs.existsSync(p);
  console.log(`  [${exists ? "✅ ENCONTRADO" : "❌ Ausente"}] ${p}`);
  if (exists && !foundPath) {
    foundPath = p;
  }
}

if (!foundPath) {
  console.error("\n❌ Nenhum arquivo gdrive_sa.json encontrado nos caminhos padrão!");
  console.error("👉 Solução na VM:");
  console.error("   mkdir -p ~/cdf/secrets");
  console.error("   cp seu_arquivo.json ~/cdf/secrets/gdrive_sa.json\n");
  process.exit(1);
}

console.log(`\n📄 Lendo arquivo selecionado: ${foundPath}`);

let creds;
try {
  creds = JSON.parse(fs.readFileSync(foundPath, "utf-8"));
} catch (err) {
  console.error("❌ O arquivo não contém um JSON válido:", err.message);
  process.exit(1);
}

if (!creds.client_email || !creds.private_key) {
  console.error(
    "❌ O JSON não parece ser uma Service Account válida do Google (falta client_email ou private_key).",
  );
  process.exit(1);
}

console.log("✅ JSON válido da Google Cloud!");
console.log(`📧 Service Account: ${creds.client_email}`);
console.log(`🏢 Projeto Google Cloud: ${creds.project_id || "(não especificado)"}`);
console.log("\n🔑 Testando geração de Access Token na Google API...");

async function testAuth() {
  try {
    const auth = new GoogleAuth({
      keyFile: foundPath,
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });

    const client = await auth.getClient();
    const token = await client.getAccessToken();

    if (token && token.token) {
      console.log("✅ Token de autenticação gerado com sucesso pela Google API!");
      console.log("🎉 Sua integração com o Google Drive está 100% pronta e operacional.");
      console.log(`\n💡 Lembre-se: Suas pastas no Google Drive devem estar compartilhadas com:`);
      console.log(`   👉 ${creds.client_email} (como Leitor / Viewer)\n`);
    } else {
      console.error("⚠️ Resposta vazia ao solicitar token.");
    }
  } catch (err) {
    console.error("❌ Erro ao autenticar no Google com esta chave:", err.message);
    process.exit(1);
  }
}

testAuth();
