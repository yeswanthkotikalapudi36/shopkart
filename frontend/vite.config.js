import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
    proxy: {
      "/customers": { target: "http://localhost:5001", changeOrigin: true },
      "/products": { target: "http://localhost:5001", changeOrigin: true },
      "/wishlist": { target: "http://localhost:5001", changeOrigin: true },
      "/cart": { target: "http://localhost:5001", changeOrigin: true },
      "/orders": { target: "http://localhost:5001", changeOrigin: true },
    },
  },
});
