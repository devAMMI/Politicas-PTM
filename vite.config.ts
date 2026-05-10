import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = 'https://cssfpgrobcgjsuosuuwe.supabase.co';

// Custom plugin: copy public dir skipping locked/unreadable files
function safePublicCopy() {
  return {
    name: 'safe-public-copy',
    closeBundle() {
      const publicDir = path.resolve(__dirname, 'public');
      const outDir = path.resolve(__dirname, 'dist');
      if (!fs.existsSync(publicDir)) return;
      for (const file of fs.readdirSync(publicDir)) {
        const src = path.join(publicDir, file);
        const dest = path.join(outDir, file);
        try {
          fs.copyFileSync(src, dest);
        } catch {
          // skip locked or unreadable files silently
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), safePublicCopy()],
  publicDir: false, // disable default public copy; handled by safePublicCopy plugin
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    historyApiFallback: true,
    proxy: {
      // /docs/* → Supabase Edge Function doc-proxy
      '/docs': {
        target: `${SUPABASE_URL}/functions/v1/doc-proxy`,
        rewrite: path => path.replace(/^\/docs/, ''),
        changeOrigin: true,
        secure: true,
      },
    },
  },
  preview: {
    historyApiFallback: true,
  },
});
