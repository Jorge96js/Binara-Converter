import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
    // Middleware para simular el proxy de la API de Vercel localmente
    proxy: {
      '/api/proxy': {
        target: 'http://localhost:5173', // No se usa realmente, el middleware captura
        bypass: async (req, res) => {
          const url = new URL(req.url, 'http://localhost:5173').searchParams.get('url');
          if (req.url.startsWith('/api/proxy') && url) {
            try {
              const response = await fetch(url);
              const buffer = await response.arrayBuffer();
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
              res.setHeader('Content-Type', response.headers.get('content-type') || 'video/mp4');
              res.end(Buffer.from(buffer));
              return false;
            } catch (err) {
              res.statusCode = 500;
              res.end('Proxy Error');
              return false;
            }
          }
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
});
