// Testes da home (site estático, sem build). Rodar: npm install && npx playwright test
const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:4173", trace: "retain-on-failure" },
  webServer: {
    command: "npx http-server site -p 4173 -c-1 -s",
    url: "http://localhost:4173/",
    reuseExistingServer: true,
    timeout: 30_000,
  },
  // Só Chromium: Firefox e WebKit (motor do Safari) não estão instalados neste ambiente. Para testar, instale com
  // "npx playwright install firefox webkit" e acrescente os projetos abaixo.
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
