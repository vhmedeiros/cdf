import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";
dotenvExpand.expand(dotenv.config({ path: ".env.development" }));

import database from "@/infra/database";
import CourseModel from "@/models/course";
import EnrollmentModel from "@/models/enrollment";
import User from "@/models/user";
import { getAccessToken } from "@/services/drive/client";
import { buildTree } from "@/services/drive/buildTree";

async function main() {
  console.log("🚀 Iniciando importação do Curso.dev direto do Google Drive...");

  const folderId = "1lwpJ1dhAHMSEztozVkVQ16noHdrwHHK2";
  const driveUrl = `https://drive.google.com/drive/folders/${folderId}?usp=sharing`;
  const token = await getAccessToken();

  if (!token) {
    throw new Error("Não foi possível autenticar com o Google Drive (verifique gdrive_sa.json).");
  }

  // 1. Busca metadados da pasta no Drive
  console.log("🔍 Consultando pasta raiz no Google Drive...");
  const folderRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${folderId}?supportsAllDrives=true&fields=id,name,mimeType`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const folderData = await folderRes.json();
  const courseTitle = folderData.name || "Curso.dev";
  console.log(`✅ Pasta encontrada: "${courseTitle}"`);

  // 2. Busca todos os arquivos da hierarquia de forma rápida
  console.log("📥 Baixando índice de arquivos e módulos do Drive...");
  const allFiles: any[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL("https://www.googleapis.com/drive/v3/files");
    url.searchParams.set("q", "trashed = false");
    url.searchParams.set(
      "fields",
      "nextPageToken,files(id,name,mimeType,size,md5Checksum,modifiedTime,videoMediaMetadata,shortcutDetails,parents)",
    );
    url.searchParams.set("pageSize", "1000");
    url.searchParams.set("supportsAllDrives", "true");
    url.searchParams.set("includeItemsFromAllDrives", "true");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.files) allFiles.push(...data.files);
    pageToken = data.nextPageToken;
  } while (pageToken);

  console.log(`✅ ${allFiles.length} arquivos analisados.`);

  // 3. Monta a árvore completa com a função pura buildTree
  console.log("🌳 Construindo árvore hierárquica Módulo → Aula → Materiais...");
  const tree = buildTree(allFiles, {
    rootFolderId: folderId,
    strategy: "auto",
  });

  console.log(`- Módulos detectados: ${tree.modules.length}`);
  console.log(`- Materiais detectados: ${tree.materialsCount}`);
  console.log(`- Duração Total: ${Math.round(tree.totalDurationSeconds / 60)} minutos`);

  // 4. Cria ou atualiza o Curso no PostgreSQL
  let course = await CourseModel.findBySlug("curso-dev");
  if (!course) {
    course = await CourseModel.create({
      title: "Curso.dev",
      slug: "curso-dev",
      description:
        "Curso completo de programação, arquitetura web e boas práticas construindo o clone do TabNews com Node.js, Next.js e PostgreSQL (Filipe Deschamps).",
      driveUrl,
      driveFolderId: folderId,
      lessonStrategy: "auto",
      status: "published",
    });
    console.log(`✅ Curso criado no banco (ID: ${course.id})`);
  } else {
    await database.query(
      `UPDATE courses
       SET drive_folder_id = $1, drive_url = $2, status = 'published'
       WHERE id = $3`,
      [folderId, driveUrl, course.id],
    );
    console.log(`✅ Curso existente atualizado (ID: ${course.id})`);
  }

  // 5. Persiste toda a árvore no PostgreSQL
  console.log("💾 Gravando módulos, aulas e vídeos no banco de dados...");
  await CourseModel.syncTreeToDatabase(course.id, tree);

  // 6. Matricula o usuário Admin para acesso imediato
  const admin = await User.findByEmail("admin@aula.local");
  if (admin) {
    const isEnrolled = await EnrollmentModel.isEnrolled(admin.id, course.id);
    if (!isEnrolled) {
      await EnrollmentModel.create({
        userId: admin.id,
        courseId: course.id,
      });
      console.log(`✅ Usuário ${admin.email} matriculado no curso com sucesso.`);
    }
  }

  console.log("\n🎉 IMPORTAÇÃO CONCLUÍDA COM SUCESSO!");
  console.log("👉 Acesse no seu navegador:");
  console.log("   http://localhost:3000/courses/curso-dev\n");
}

main()
  .catch((err) => {
    console.error("❌ Erro fatal na importação:", err);
    process.exit(1);
  })
  .finally(async () => {
    // encerra conexões
    process.exit(0);
  });
