import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 4173,
    host: true,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        // Keep the vendor bundles cacheable across content-only deploys.
        // Rollup 5 (Vite 8) dropped the object form: chunks are named by a
        // function that maps a resolved module id to a chunk name.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/.test(id)) {
            return "react";
          }
          if (id.includes("@tanstack")) return "query";
          if (/[\\/]node_modules[\\/](react-markdown|remark-|mdast|micromark|unist|vfile|hast)/.test(id)) {
            return "markdown";
          }
          return undefined;
        },
      },
    },
  },
});
