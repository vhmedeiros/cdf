import { test, expect } from "@playwright/test";

test.describe("Fluxo Completo da Plataforma Aula (E2E)", () => {
  const ADMIN_EMAIL = "admin@aula.local";
  const ADMIN_PASS = "admin123456";
  const DEFAULT_COURSE_SLUG = "77-melhores-livros-da-historia";

  test("Cenário 1: Autenticação, Rejeição de Senha Errada e Logout Imediato", async ({ page }) => {
    await page.goto("/login");

    // 1. Tenta login com senha incorreta
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', "senha-errada-123");
    await page.click('button[type="submit"]');

    // Deve exibir alerta de erro e continuar em /login
    const errorEl = page.locator("text=E-mail ou senha incorretos");
    await expect(errorEl).toBeVisible({ timeout: 10_000 });
    expect(page.url()).toContain("/login");

    // 2. Faz login com credenciais válidas
    await page.fill('input[type="password"]', ADMIN_PASS);
    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/v1/sessions") && res.status() === 201),
      page.click('button[type="submit"]'),
    ]);

    // Deve redirecionar para a home ou painel admin
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 });

    // 3. Verifica que o UserMenu está presente no topo
    const userMenuBtn = page.locator('button[title="Minha Conta"]');
    await expect(userMenuBtn).toBeVisible({ timeout: 15_000 });

    // 4. Abre o UserMenu e clica em Sair da Conta (Logout)
    await userMenuBtn.click();
    const logoutBtn = page.locator("text=Sair da Conta");
    await expect(logoutBtn).toBeVisible({ timeout: 5_000 });
    await logoutBtn.click();

    // Deve ser redirecionado imediatamente para /login
    await page.waitForURL((url) => url.pathname.includes("/login"), { timeout: 10_000 });
    expect(page.url()).toContain("/login");
  });

  test("Cenário 2: Catálogo de Cursos e Sala de Aula", async ({ page }) => {
    // Login
    await page.goto("/login");
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASS);
    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/v1/sessions") && res.status() === 201),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 });

    // Acessa Meus Cursos
    await page.goto("/courses");
    await expect(page.locator("h1")).toContainText("Meus Cursos");

    // Clica no primeiro card de curso disponível
    const courseCard = page.locator('a[href^="/courses/"]').first();
    await expect(courseCard).toBeVisible({ timeout: 10_000 });
    const courseHref = await courseCard.getAttribute("href");
    await courseCard.click();

    // Deve abrir a sala de aula do curso
    await page.waitForURL((url) => url.pathname === courseHref, { timeout: 15_000 });
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("Cenário 3: Experiência de Aula, Player e Alternância de Mídia", async ({ page }) => {
    // Login direto e navegação para a sala de aula
    await page.goto("/login");
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASS);
    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/v1/sessions") && res.status() === 201),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForURL((url) => !url.pathname.includes("/login"));

    // Navega para um curso válido
    await page.goto(`/courses/${DEFAULT_COURSE_SLUG}`);

    // Verifica barra lateral de módulos
    const sidebarTitle = page.locator("text=Módulos").or(page.locator("text=Conteúdo")).first();
    await expect(sidebarTitle).toBeVisible({ timeout: 15_000 });

    // Testa botão de Expandir / Recolher Todos os cards de aulas
    const toggleCollapseBtn = page
      .locator("button", { hasText: /Expandir Todos|Recolher Todos/i })
      .first();
    if (await toggleCollapseBtn.isVisible()) {
      await toggleCollapseBtn.click();
      await page.waitForTimeout(300);
      await toggleCollapseBtn.click();
    }

    // Alternância de Vídeo para Áudio via botão
    const audioToggleBtn = page
      .locator('button[title*="Modo Áudio"]')
      .or(page.locator('button[title*="Áudio"]'))
      .first();
    if (await audioToggleBtn.isVisible()) {
      await audioToggleBtn.click();
      await page.waitForTimeout(500);
      // Deve exibir o botão de retornar ao vídeo
      const backToVideoBtn = page
        .locator("text=Voltar ao Vídeo")
        .or(page.locator('button[title*="Vídeo"]'))
        .first();
      if (await backToVideoBtn.isVisible()) {
        await backToVideoBtn.click();
      }
    }
  });

  test("Cenário 4: Aprendizado Ativo - Anotações e Caderno de Estudos", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASS);
    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/v1/sessions") && res.status() === 201),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForURL((url) => !url.pathname.includes("/login"));

    await page.goto(`/courses/${DEFAULT_COURSE_SLUG}`);

    // Aguarda carregar os módulos e clica no primeiro item da barra lateral se necessário
    const firstMaterial = page
      .locator("button")
      .filter({ hasText: /Aula|min|Introdução/i })
      .first();
    if (await firstMaterial.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstMaterial.click();
    }

    // Botão de Nova Nota
    const newNoteBtn = page.locator('button:has-text("Nova Nota")').first();
    if (await newNoteBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newNoteBtn.click();

      // Campo de nova nota
      const noteInput = page
        .locator('textarea[placeholder*="Digite sua anotação"]')
        .or(page.locator("textarea"))
        .first();
      await expect(noteInput).toBeVisible({ timeout: 5000 });

      const testText = `Nota E2E teste automatizado: ${Date.now()}`;
      await noteInput.fill(testText);

      const saveNoteBtn = page
        .locator('button:has-text("Salvar Anotação")')
        .or(page.locator('button:has-text("Salvar")'))
        .first();
      await saveNoteBtn.click();

      // Confirma que a nota aparece na lista
      await expect(page.locator(`text=${testText}`)).toBeVisible({ timeout: 10_000 });
    }
  });

  test("Cenário 5: Painel Admin - Cursos, Convites e Permissões", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASS);
    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/v1/sessions") && res.status() === 201),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForURL((url) => !url.pathname.includes("/login"));

    // Painel Admin: Cursos
    await page.goto("/admin/courses");
    await expect(page.locator("h1")).toContainText("Gerenciamento de Cursos");
    // Verifica que pelo menos um curso cadastrado está visível
    const adminCourseCard = page.locator("h2").first();
    await expect(adminCourseCard).toBeVisible({ timeout: 10_000 });

    // Painel Admin: Convites & Alunos
    await page.goto("/admin/invites");
    await expect(page.locator("h1")).toContainText("Convites & Alunos");
    await expect(page.locator("text=Alunos Cadastrados na Plataforma")).toBeVisible();

    // Verifica que as badges de controle de curso (verde/vermelho) aparecem
    const courseBadge = page
      .locator('button[title*="Curso ATIVO"]')
      .or(page.locator('button[title*="Curso BLOQUEADO"]'))
      .first();
    await expect(courseBadge).toBeVisible({ timeout: 10_000 });
  });
});
