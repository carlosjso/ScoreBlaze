import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/players": "http://localhost:8000",
      "/teams": "http://localhost:8000",
      "/team-memberships": "http://localhost:8000",
    },
  },
});
