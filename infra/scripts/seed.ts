import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";
import bcrypt from "bcryptjs";
import database from "@/infra/database";

dotenvExpand.expand(dotenv.config({ path: ".env.development" }));

async function seed() {
  console.log("🌱 Iniciando seed do banco de dados para desenvolvimento...");

  const client = await database.getNewClient();

  try {
    await client.query("BEGIN;");

    // 1. Cria usuário Admin
    const adminPasswordHash = await bcrypt.hash("admin123456", 10);
    const adminFeatures = [
      "read:course",
      "create:note",
      "create:course",
      "create:invite",
      "read:course:all",
      "update:enrollment",
    ];

    const userRes = await client.query(
      `INSERT INTO users (email, password, display_name, features)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET
         password = EXCLUDED.password,
         features = EXCLUDED.features
       RETURNING id, email, display_name`,
      ["admin@aula.local", adminPasswordHash, "Administrador CDF", adminFeatures],
    );
    const adminUser = userRes.rows[0];
    console.log(`✅ Usuário Admin pronto: ${adminUser.email} (senha: admin123456)`);

    // 2. Cria Curso de Exemplo
    const courseRes = await client.query(
      `INSERT INTO courses (
        title, slug, description, drive_url, drive_folder_id, cover_url,
        accent_color, status, lesson_strategy, sync_status, total_duration_seconds, materials_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title,
        status = 'published'
      RETURNING id, title, slug`,
      [
        "Direito Constitucional para Concursos",
        "direito-constitucional",
        "Curso completo cobrindo direitos e garantias fundamentais, organização dos poderes e controle de constitucionalidade.",
        "https://drive.google.com/drive/folders/sample-fake-folder-id",
        "sample-fake-folder-id",
        null,
        "#d4af37",
        "published",
        "auto",
        "ok",
        10800, // 3 horas
        6,
      ],
    );
    const course = courseRes.rows[0];
    console.log(`✅ Curso pronto: ${course.title} (slug: ${course.slug})`);

    // 3. Cria Módulo 1
    const mod1Res = await client.query(
      `INSERT INTO modules (course_id, drive_folder_id, raw_name, title, position, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id`,
      [
        course.id,
        "folder-mod-1",
        "001. Direitos e Garantias Fundamentais",
        "Direitos e Garantias Fundamentais",
        1,
      ],
    );
    const mod1Id = mod1Res.rows[0].id;

    // Aula 1
    const les1Res = await client.query(
      `INSERT INTO lessons (module_id, drive_folder_id, raw_name, title, position, duration_seconds, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING id`,
      [
        mod1Id,
        "folder-les-1",
        "01. Teoria Geral dos Direitos Fundamentais",
        "Teoria Geral dos Direitos Fundamentais",
        1,
        3600,
      ],
    );
    const les1Id = les1Res.rows[0].id;

    await client.query(
      `INSERT INTO materials (lesson_id, drive_file_id, raw_name, title, kind, mime, size_bytes, duration_seconds, position, is_active)
       VALUES
       ($1, 'fake-file-video-1', '001. Videoaula.mp4', 'Videoaula', 'video', 'video/mp4', 524288000, 3600, 1, true),
       ($1, 'fake-file-pdf-1', '002. Material de Apoio.pdf', 'Material de Apoio', 'pdf', 'application/pdf', 2097152, 0, 2, true)
       ON CONFLICT (drive_file_id) DO NOTHING`,
      [les1Id],
    );

    // Aula 2
    const les2Res = await client.query(
      `INSERT INTO lessons (module_id, drive_folder_id, raw_name, title, position, duration_seconds, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING id`,
      [mod1Id, "folder-les-2", "02. Remédios Constitucionais", "Remédios Constitucionais", 2, 3600],
    );
    const les2Id = les2Res.rows[0].id;

    await client.query(
      `INSERT INTO materials (lesson_id, drive_file_id, raw_name, title, kind, mime, size_bytes, duration_seconds, position, is_active)
       VALUES
       ($1, 'fake-file-video-2', '001. Habeas Corpus e Mandado de Segurança.mp4', 'Habeas Corpus e Mandado de Segurança', 'video', 'video/mp4', 600000000, 3600, 1, true)
       ON CONFLICT (drive_file_id) DO NOTHING`,
      [les2Id],
    );

    // 4. Cria Módulo 2
    const mod2Res = await client.query(
      `INSERT INTO modules (course_id, drive_folder_id, raw_name, title, position, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id`,
      [course.id, "folder-mod-2", "002. Organização do Estado", "Organização do Estado", 2],
    );
    const mod2Id = mod2Res.rows[0].id;

    // Aula 3
    const les3Res = await client.query(
      `INSERT INTO lessons (module_id, drive_folder_id, raw_name, title, position, duration_seconds, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING id`,
      [
        mod2Id,
        "folder-les-3",
        "01. Federação e Repartição de Competências",
        "Federação e Repartição de Competências",
        1,
        3600,
      ],
    );
    const les3Id = les3Res.rows[0].id;

    await client.query(
      `INSERT INTO materials (lesson_id, drive_file_id, raw_name, title, kind, mime, size_bytes, duration_seconds, position, is_active)
       VALUES
       ($1, 'fake-file-video-3', '001. Repartição de Competências.mp4', 'Repartição de Competências', 'video', 'video/mp4', 450000000, 3600, 1, true),
       ($1, 'fake-file-audio-1', '002. Áudio Resumo para Trânsito.mp3', 'Áudio Resumo para Trânsito', 'audio', 'audio/mpeg', 15000000, 1200, 2, true)
       ON CONFLICT (drive_file_id) DO NOTHING`,
      [les3Id],
    );

    // 5. Matricula o Admin no Curso
    await client.query(
      `INSERT INTO enrollments (user_id, course_id, granted_by)
       VALUES ($1, $2, $1)
       ON CONFLICT (user_id, course_id) DO NOTHING`,
      [adminUser.id, course.id],
    );
    console.log(`✅ Admin matriculado no curso com sucesso.`);

    await client.query("COMMIT;");
    console.log("🎉 Seed finalizado com sucesso!");
  } catch (error) {
    await client.query("ROLLBACK;");
    console.error("❌ Erro durante o seed:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
