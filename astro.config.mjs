import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  base: "/presuntodepredador",
  trailingSlash: "always",
  devToolbar: { enabled: true },
  experimental: {
    chromeDevtoolsWorkspace: true,
  },
});
