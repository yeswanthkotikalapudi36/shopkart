import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/customers": "http://localhost:5001",
      "/products": "http://localhost:5001",
      "/wishlist": "http://localhost:5001",
      "/cart": "http://localhost:5001",
      "/orders": "http://localhost:5001",
    },
  },
});
