import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: "web",
  resolve: {
    alias: { "@": fileURLToPath(new URL("./web/src", import.meta.url)) },
  },
  plugins: [react(), tailwindcss()],
  server: {
    proxy: { "/api": { target: "http://127.0.0.1:8787", changeOrigin: false } },
  },
  build: { outDir: "../dist", emptyOutDir: true },
});
