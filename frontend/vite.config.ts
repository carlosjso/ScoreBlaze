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
      "/match-events": "http://localhost:8000",
      "/player-stats": "http://localhost:8000",
      "/players": "http://localhost:8000",
      "/teams": "http://localhost:8000",
      "/team-stats": "http://localhost:8000",
      "/team-memberships": "http://localhost:8000",
      "/matches": "http://localhost:8000",
    },
  },
});
