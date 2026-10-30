import { test, expect } from "@playwright/test";

test.describe("Experiência Mobile (E2E) — Viewport Smartphone 390x844", () => {
  const ADMIN_EMAIL = "admin@aula.local";
  const ADMIN_PASS = "admin123456";

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
});
