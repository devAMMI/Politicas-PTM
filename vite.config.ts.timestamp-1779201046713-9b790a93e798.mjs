// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.mjs";
import fs from "fs";
import path from "path";
var __vite_injected_original_dirname = "/home/project";
var SUPABASE_URL = "https://cssfpgrobcgjsuosuuwe.supabase.co";
function safePublicCopy() {
  return {
    name: "safe-public-copy",
    closeBundle() {
      const publicDir = path.resolve(__vite_injected_original_dirname, "public");
      const outDir = path.resolve(__vite_injected_original_dirname, "dist");
      if (!fs.existsSync(publicDir)) return;
      for (const file of fs.readdirSync(publicDir)) {
        const src = path.join(publicDir, file);
        const dest = path.join(outDir, file);
        try {
          fs.copyFileSync(src, dest);
        } catch {
        }
      }
    }
  };
}
var vite_config_default = defineConfig({
  plugins: [react(), safePublicCopy()],
  publicDir: false,
  // disable default public copy; handled by safePublicCopy plugin
  optimizeDeps: {
    exclude: ["lucide-react"]
  },
  server: {
    historyApiFallback: true,
    proxy: {
      // /docs/* → Supabase Edge Function doc-proxy
      "/docs": {
        target: `${SUPABASE_URL}/functions/v1/doc-proxy`,
        rewrite: (path2) => path2.replace(/^\/docs/, ""),
        changeOrigin: true,
        secure: true
      }
    }
  },
  preview: {
    historyApiFallback: true
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5cbmNvbnN0IFNVUEFCQVNFX1VSTCA9ICdodHRwczovL2Nzc2ZwZ3JvYmNnanN1b3N1dXdlLnN1cGFiYXNlLmNvJztcblxuLy8gQ3VzdG9tIHBsdWdpbjogY29weSBwdWJsaWMgZGlyIHNraXBwaW5nIGxvY2tlZC91bnJlYWRhYmxlIGZpbGVzXG5mdW5jdGlvbiBzYWZlUHVibGljQ29weSgpIHtcbiAgcmV0dXJuIHtcbiAgICBuYW1lOiAnc2FmZS1wdWJsaWMtY29weScsXG4gICAgY2xvc2VCdW5kbGUoKSB7XG4gICAgICBjb25zdCBwdWJsaWNEaXIgPSBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAncHVibGljJyk7XG4gICAgICBjb25zdCBvdXREaXIgPSBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnZGlzdCcpO1xuICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKHB1YmxpY0RpcikpIHJldHVybjtcbiAgICAgIGZvciAoY29uc3QgZmlsZSBvZiBmcy5yZWFkZGlyU3luYyhwdWJsaWNEaXIpKSB7XG4gICAgICAgIGNvbnN0IHNyYyA9IHBhdGguam9pbihwdWJsaWNEaXIsIGZpbGUpO1xuICAgICAgICBjb25zdCBkZXN0ID0gcGF0aC5qb2luKG91dERpciwgZmlsZSk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgZnMuY29weUZpbGVTeW5jKHNyYywgZGVzdCk7XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIC8vIHNraXAgbG9ja2VkIG9yIHVucmVhZGFibGUgZmlsZXMgc2lsZW50bHlcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtyZWFjdCgpLCBzYWZlUHVibGljQ29weSgpXSxcbiAgcHVibGljRGlyOiBmYWxzZSwgLy8gZGlzYWJsZSBkZWZhdWx0IHB1YmxpYyBjb3B5OyBoYW5kbGVkIGJ5IHNhZmVQdWJsaWNDb3B5IHBsdWdpblxuICBvcHRpbWl6ZURlcHM6IHtcbiAgICBleGNsdWRlOiBbJ2x1Y2lkZS1yZWFjdCddLFxuICB9LFxuICBzZXJ2ZXI6IHtcbiAgICBoaXN0b3J5QXBpRmFsbGJhY2s6IHRydWUsXG4gICAgcHJveHk6IHtcbiAgICAgIC8vIC9kb2NzLyogXHUyMTkyIFN1cGFiYXNlIEVkZ2UgRnVuY3Rpb24gZG9jLXByb3h5XG4gICAgICAnL2RvY3MnOiB7XG4gICAgICAgIHRhcmdldDogYCR7U1VQQUJBU0VfVVJMfS9mdW5jdGlvbnMvdjEvZG9jLXByb3h5YCxcbiAgICAgICAgcmV3cml0ZTogcGF0aCA9PiBwYXRoLnJlcGxhY2UoL15cXC9kb2NzLywgJycpLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIHNlY3VyZTogdHJ1ZSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbiAgcHJldmlldzoge1xuICAgIGhpc3RvcnlBcGlGYWxsYmFjazogdHJ1ZSxcbiAgfSxcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF5TixTQUFTLG9CQUFvQjtBQUN0UCxPQUFPLFdBQVc7QUFDbEIsT0FBTyxRQUFRO0FBQ2YsT0FBTyxVQUFVO0FBSGpCLElBQU0sbUNBQW1DO0FBS3pDLElBQU0sZUFBZTtBQUdyQixTQUFTLGlCQUFpQjtBQUN4QixTQUFPO0FBQUEsSUFDTCxNQUFNO0FBQUEsSUFDTixjQUFjO0FBQ1osWUFBTSxZQUFZLEtBQUssUUFBUSxrQ0FBVyxRQUFRO0FBQ2xELFlBQU0sU0FBUyxLQUFLLFFBQVEsa0NBQVcsTUFBTTtBQUM3QyxVQUFJLENBQUMsR0FBRyxXQUFXLFNBQVMsRUFBRztBQUMvQixpQkFBVyxRQUFRLEdBQUcsWUFBWSxTQUFTLEdBQUc7QUFDNUMsY0FBTSxNQUFNLEtBQUssS0FBSyxXQUFXLElBQUk7QUFDckMsY0FBTSxPQUFPLEtBQUssS0FBSyxRQUFRLElBQUk7QUFDbkMsWUFBSTtBQUNGLGFBQUcsYUFBYSxLQUFLLElBQUk7QUFBQSxRQUMzQixRQUFRO0FBQUEsUUFFUjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGO0FBRUEsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLE1BQU0sR0FBRyxlQUFlLENBQUM7QUFBQSxFQUNuQyxXQUFXO0FBQUE7QUFBQSxFQUNYLGNBQWM7QUFBQSxJQUNaLFNBQVMsQ0FBQyxjQUFjO0FBQUEsRUFDMUI7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLG9CQUFvQjtBQUFBLElBQ3BCLE9BQU87QUFBQTtBQUFBLE1BRUwsU0FBUztBQUFBLFFBQ1AsUUFBUSxHQUFHLFlBQVk7QUFBQSxRQUN2QixTQUFTLENBQUFBLFVBQVFBLE1BQUssUUFBUSxXQUFXLEVBQUU7QUFBQSxRQUMzQyxjQUFjO0FBQUEsUUFDZCxRQUFRO0FBQUEsTUFDVjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxvQkFBb0I7QUFBQSxFQUN0QjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbInBhdGgiXQp9Cg==
