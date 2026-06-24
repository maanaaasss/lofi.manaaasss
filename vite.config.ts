import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateManifest } from "./music/generate.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    {
      name: "watch-manifest",
      configureServer(server) {
        const publicDir = path.resolve(__dirname, "public");
        
        const targetExts = [
          ".mp3", ".ogg", ".wav", ".mp4", ".webm",
          ".jpg", ".jpeg", ".png", ".webp"
        ];

        const isTargetFile = (filePath: string) => {
          const ext = path.extname(filePath).toLowerCase();
          return targetExts.includes(ext) && !filePath.includes("node_modules");
        };

        const handleChange = async (filePath: string) => {
          if (!isTargetFile(filePath)) return;
          
          try {
            console.log(`[manifest-watcher] File changed: ${path.basename(filePath)}. Regenerating manifest...`);
            await generateManifest();
            
            // Notify client via websocket HMR
            server.ws.send("manifest-update", { timestamp: Date.now() });
          } catch (err) {
            console.error("[manifest-watcher] Error regenerating manifest:", err);
          }
        };

        server.watcher.add(publicDir);
        server.watcher.on("add", handleChange);
        server.watcher.on("change", handleChange);
        server.watcher.on("unlink", handleChange);
      },
    },
  ],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.dirname(fileURLToPath(import.meta.url)),
    },
  },
});
