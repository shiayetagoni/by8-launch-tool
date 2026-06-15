import { fileURLToPath, URL } from "url";
import { readFileSync } from "fs";
import { resolve } from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import environment from "vite-plugin-environment";

const ii_url =
  process.env.DFX_NETWORK === "local"
    ? `http://rdmx6-jaaaa-aaaaa-aaadq-cai.localhost:8081/`
    : `https://identity.internetcomputer.org/`;

process.env.II_URL = process.env.II_URL || ii_url;
process.env.STORAGE_GATEWAY_URL =
  process.env.STORAGE_GATEWAY_URL || "https://blob.caffeine.ai";

// Read env.json at build time and inject canister ID so config.js can find it.
// In production the platform rewrites env.json before serving, but the env var
// path is checked at JS runtime against the build-time baked value.  If env.json
// already has a real canister ID (not the literal string "undefined") we forward
// it as CANISTER_ID_BACKEND so the actor initialises correctly.
try {
  const envJsonPath = resolve(__dirname, "env.json");
  const envJson = JSON.parse(readFileSync(envJsonPath, "utf-8"));
  if (envJson.backend_canister_id && envJson.backend_canister_id !== "undefined") {
    process.env.CANISTER_ID_BACKEND = envJson.backend_canister_id;
  }
} catch {
  // env.json not present or unreadable at build time — that is fine
}

export default defineConfig({
  logLevel: "error",
  build: {
    emptyOutDir: true,
    sourcemap: false,
    minify: false,
  },
  css: {
    postcss: "./postcss.config.js",
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4943",
        changeOrigin: true,
      },
    },
  },
  plugins: [
    environment("all", { prefix: "CANISTER_" }),
    environment("all", { prefix: "DFX_" }),
    environment(["II_URL"]),
    environment(["STORAGE_GATEWAY_URL"]),
    react(),
  ],
  resolve: {
    alias: [
      {
        find: "declarations",
        replacement: fileURLToPath(new URL("../declarations", import.meta.url)),
      },
      {
        find: "@",
        replacement: fileURLToPath(new URL("./src", import.meta.url)),
      },
    ],
    dedupe: ["@dfinity/agent"]
  },
});
