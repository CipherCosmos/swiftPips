import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/obrest': {
        target: 'https://ant.aliceblueonline.com',
        changeOrigin: true,
        secure: false,
        headers: {
          'Origin': 'https://ant.aliceblueonline.com',
          'Referer': 'https://ant.aliceblueonline.com/home',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
        },
        configure: (proxy, options) => {
            proxyReq.setHeader('Origin', 'https://ant.aliceblueonline.com');
            proxyReq.setHeader('Referer', 'https://ant.aliceblueonline.com/home');
            proxyReq.setHeader('Host', 'ant.aliceblueonline.com');
            console.log('--- Proxying Request ---');
            console.log('Method:', req.method);
            console.log('URL:', req.url);
            console.log('Auth Header:', req.headers['authorization']);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('--- Target Response ---');
            console.log('Status:', proxyRes.statusCode);
            console.log('Response Headers:', JSON.stringify(proxyRes.headers, null, 2));
          });
          proxy.on('error', (err, req, res) => {
            console.log('Proxy Error:', err);
          });
        }
      },
      '/omk': {
        target: 'https://ant.aliceblueonline.com',
        changeOrigin: true,
        secure: false,
        headers: {
          'Origin': 'https://ant.aliceblueonline.com',
          'Referer': 'https://ant.aliceblueonline.com/home',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
        },
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            proxyReq.setHeader('Origin', 'https://ant.aliceblueonline.com');
            proxyReq.setHeader('Referer', 'https://ant.aliceblueonline.com/home');
            proxyReq.setHeader('Host', 'ant.aliceblueonline.com');
          });
        }
      },
    },
  },
})