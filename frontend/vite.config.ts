import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const backendTarget = "http://127.0.0.1:8000";

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
        target: "ws://127.0.0.1:8000",
        ws: true,
      },
      "/auth": backendTarget,
      "/account-invitations": backendTarget,
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
