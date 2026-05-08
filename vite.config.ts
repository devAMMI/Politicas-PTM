import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const SUPABASE_URL = 'https://cssfpgrobcgjsuosuuwe.supabase.co';

export default defineConfig({
  plugins: [react()],
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
