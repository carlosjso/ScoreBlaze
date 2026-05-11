import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const backendTarget = "http://localhost:8000";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/ws": {
        target: "ws://localhost:8000",
        ws: true,
      },
      "/auth": backendTarget,
      "/users": backendTarget,
      "/match-events": backendTarget,
      "/player-stats": backendTarget,
      "/api/players": backendTarget,
      "/api/teams": backendTarget,
      "/api/leagues": backendTarget,
      "/team-stats": backendTarget,
      "/team-memberships": backendTarget,
      "/matches": backendTarget,
    },
  },
});
