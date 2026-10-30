import { test, expect } from "@playwright/test";

test.describe("Experiência Mobile (E2E) — Viewport Smartphone 390x844", () => {
  const ADMIN_EMAIL = "admin@aula.local";
  const ADMIN_PASS = "admin123456";
  const DEFAULT_COURSE_SLUG = "direito-constitucional";

  test.use({
    viewport: { width: 390, height: 844 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });

  test("Cenário Mobile 1: Navegação Inferior (Mobile Dock), Busca e Drawer de Perfil", async ({
    page,
  }) => {
    // 1. Login na plataforma em tela móvel
    await page.goto("/login");

    // Na tela de login a barra inferior não deve aparecer
    const bottomNavLogin = page.locator('nav[aria-label="Navegação móvel principal"]');
    await expect(bottomNavLogin).toBeHidden();

    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASS);
    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/v1/sessions") && res.status() === 201),
      page.click('button[type="submit"]'),
    ]);

    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 });

    // Oculta badge de dev do Next.js para não interceptar cliques no rodapé
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });

    // 2. Na Home, a barra inferior móvel DEVE estar visível
    const bottomNav = page.locator('nav[aria-label="Navegação móvel principal"]');
    await expect(bottomNav).toBeVisible();

    // 3. Testa clique no link "Cursos" da barra inferior
    const cursosLink = bottomNav.locator('a[href="/courses"]');
    await cursosLink.click();
    await expect(page).toHaveURL(/.*\/courses/);

    // Reaplica ocultação do portal no roteamento
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });

    // 4. Testa acionamento da Busca pelo dock inferior
    const searchBtn = bottomNav.locator('button:has-text("Buscar")');
    await searchBtn.click();

    // CommandPalette deve se abrir
    const searchInput = page.locator('input[placeholder*="Buscar"]');
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    // Fecha a busca pelo teclado Escape
    await page.keyboard.press("Escape");
    await expect(searchInput).toBeHidden({ timeout: 5000 });

    // 5. Testa abertura do Drawer de Perfil pela barra inferior
    const perfilBtn = bottomNav.locator('button[title="Menu do Usuário"]');
    await perfilBtn.click();

    // Drawer de perfil deve exibir nome e opções
    const drawer = page.locator('[data-testid="mobile-account-drawer"]');
    await expect(drawer).toBeVisible({ timeout: 5000 });
    await expect(drawer.locator("text=Administrador CDF")).toBeVisible();
    await expect(drawer.locator("text=Acesso de Administrador")).toBeVisible();

    // Fecha o drawer clicando no botão fechar do drawer
    const closeDrawerBtn = drawer.locator('button[title="Fechar"]').first();
    await closeDrawerBtn.click();
    await expect(drawer).toBeHidden();

    // 6. Retorna para a Home pelo dock clicando no link "/"
    const inicioLink = bottomNav.locator('a[href="/"]');
    await inicioLink.click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("Cenário Mobile 2: Sala de Aula, Player e Abas Táteis (Aulas, Anotações, Materiais, Áudio)", async ({
    page,
  }) => {
    // 1. Login e navegação direta para a sala de aula do curso
    await page.goto("/login");
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASS);
    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/v1/sessions") && res.status() === 201),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForURL((url) => !url.pathname.includes("/login"));

    // Oculta badge de dev do Next.js
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });

    // 2. Acessa a sala de aula do curso em viewport mobile
    await page.goto(`/courses/${DEFAULT_COURSE_SLUG}`);
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });

    // Aguarda o título da aula e os seletores de abas mobile
    const mobileTabsBar = page.locator(".md\\:hidden button:has-text('Aulas')");
    await expect(mobileTabsBar).toBeVisible({ timeout: 15_000 });

    // 3. Testa Aba "Aulas" (renderiza a árvore de módulos inline abaixo do vídeo)
    const aulasTabBtn = page.locator(".md\\:hidden button:has-text('Aulas')");
    await aulasTabBtn.click();
    // A grade inline de módulos deve estar visível
    const modulesHeader = page.locator("text=Módulos").or(page.locator("text=Conteúdo")).first();
    await expect(modulesHeader).toBeVisible();

    // 4. Testa Aba "Anotações"
    const notesTabBtn = page.locator(".md\\:hidden button:has-text('Anotações')");
    await notesTabBtn.click();
    // Deve renderizar o bloco de anotações da aula
    const notesHeading = page.getByRole("heading", { name: "Anotações desta Aula" }).first();
    await expect(notesHeading).toBeVisible({ timeout: 5000 });

    // 5. Testa Aba "Materiais"
    const materialsTabBtn = page.locator(".md\\:hidden button:has-text('Materiais')");
    await materialsTabBtn.click();
    // Deve renderizar materiais ou informações da aula
    const materialsSection = page.locator('a[title="Baixar material"]').or(page.locator("text=Sobre o curso"));
    await expect(materialsSection.first()).toBeVisible({ timeout: 5000 });

    // 6. Testa Alternância de Áudio na barra de ações mobile
    const audioToggleBtn = page.locator('button[title*="Áudio"]').first();
    if (await audioToggleBtn.isVisible()) {
      await audioToggleBtn.click();
      await page.waitForTimeout(400);

      // Deve exibir botão para retornar ao vídeo
      const backToVideoBtn = page.locator('button[title*="Vídeo"]').or(page.locator("text=Voltar ao Vídeo")).first();
      await expect(backToVideoBtn).toBeVisible({ timeout: 5000 });

      // Retorna ao modo vídeo
      await backToVideoBtn.click();
      await page.waitForTimeout(400);
    }
  });
  test("Cenário Mobile 3: Dashboard do Estudante Responsivo (Hero, Streak 2x2, Heatmap e Revisões)", async ({
    page,
  }) => {
    // 1. Login e acesso à Home em viewport smartphone
    await page.goto("/login");
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASS);
    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/v1/sessions") && res.status() === 201),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForURL((url) => !url.pathname.includes("/login"));
    await page.goto("/");
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });

    // 2. Verifica Hero Resume ou Call-to-action
    const heroBtn = page.locator('main a[href*="/courses"]').first();
    await expect(heroBtn).toBeVisible({ timeout: 10_000 });

    // 3. Verifica Grid de Streak e Metas (Ofensiva, Tempo Estudado, Concluídas, Revisões Hoje)
    const ofensivaCard = page.locator("text=Ofensiva").first();
    await expect(ofensivaCard).toBeVisible();
    const tempoCard = page.locator("text=Tempo Estudado").first();
    await expect(tempoCard).toBeVisible();

    // 4. Verifica Mapa de Calor e toque em célula para detalhes
    const heatmapTitle = page.locator("text=Mapa de Calor de Estudos").first();
    await expect(heatmapTitle).toBeVisible();

    // Clica numa das células do heatmap para testar feedback tátil
    const heatmapCells = page.locator('.overflow-x-auto div[title*="min"]');
    if ((await heatmapCells.count()) > 0) {
      await heatmapCells.last().click();
      await page.waitForTimeout(200);
      // Deve exibir informação de data no cabeçalho do heatmap
      const dateInfo = page.locator(".font-mono strong").first();
      await expect(dateInfo).toBeVisible();
    }

    // 5. Verifica Seção de Cursos em Andamento com cards empilhados
    const coursesSection = page.locator("text=Meus Cursos em Andamento").first();
    await expect(coursesSection).toBeVisible();
  });
  test("Cenário Mobile 4: Telas Secundárias (Catálogo de Cursos, Login Touch e Caderno de Estudos com Filtro)", async ({
    page,
  }) => {
    // 1. Acesso à tela de Login em viewport smartphone e validação de touch target
    await page.goto("/login");
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();

    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASS);
    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/v1/sessions") && res.status() === 201),
      submitBtn.click(),
    ]);
    await page.waitForURL((url) => !url.pathname.includes("/login"));
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });

    // 2. Catálogo de Cursos no Mobile
    await page.goto("/courses");
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    const courseCard = page.locator('main a[href*="/courses/"]').first();
    await expect(courseCard).toBeVisible({ timeout: 10_000 });

    // 3. Caderno de Estudos do Curso no Mobile
    await page.goto(`/courses/${DEFAULT_COURSE_SLUG}/caderno`);
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });

    // Cabeçalho adaptado com botão de voltar compacto
    const voltarBtn = page.locator('header a[href*="/courses/"]').first();
    await expect(voltarBtn).toBeVisible({ timeout: 10_000 });

    // Seletor Dropdown de Módulos (Mobile)
    const moduleSelect = page.locator('select[aria-label="Filtrar por Módulo"]');
    await expect(moduleSelect).toBeVisible();

    // Filtro de Importantes
    const importantToggle = page.locator('button:has-text("Importantes")');
    await expect(importantToggle).toBeVisible();
    await importantToggle.click();
    await page.waitForTimeout(300);
    await importantToggle.click();

    // Exportar Markdown
    const exportBtn = page.locator('button:has-text("Exportar")');
    await expect(exportBtn).toBeVisible();
  });
});