import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tagger from "@dhiwise/component-tagger";

// https://vitejs.dev/config/
export default defineConfig({
  // This changes the out put dir from dist to build
  // comment this out if that isn't relevant for your project
  build: {
    outDir: "build",
    chunkSizeWarningLimit: 2000,
  },
  plugins: [react(), tsconfigPaths(), tagger()],
  server: {
    port: 5173,
    host: "0.0.0.0",
    strictPort: false,  // auto-pick a free port if 5173 is busy
    allowedHosts: ['.amazonaws.com', '.builtwithrocket.new']
  },
  preview: {
    port: 4173,
    strictPort: false
  },
  appType: 'spa'
});