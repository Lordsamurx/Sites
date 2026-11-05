// Testes do site (Playwright). Rodar a partir desta pasta: npm install && npx playwright test
// Por padrão só Chromium. Com os navegadores instalados (npx playwright install firefox webkit), use TODOS=1 para rodar também Firefox e WebKit (Safari).
const { defineConfig, devices } = require("@playwright/test");

const PORT = 4173;
const projects = [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }];
if (process.env.TODOS) {
  projects.push({ name: "firefox", use: { ...devices["Desktop Firefox"], viewport: { width: 1440, height: 900 } } });
  projects.push({ name: "webkit", use: { ...devices["Desktop Safari"], viewport: { width: 1440, height: 900 } } });
}

module.exports = defineConfig({
  testDir: "tests",
  timeout: 45_000,
  fullyParallel: true,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: `http://localhost:${PORT}/`, trace: "retain-on-failure" },
  projects,
  webServer: { command: `node tests/server.js ${PORT}`, url: `http://localhost:${PORT}/`, reuseExistingServer: true },
});
