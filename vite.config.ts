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
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('Origin', 'https://ant.aliceblueonline.com');
            proxyReq.setHeader('Referer', 'https://ant.aliceblueonline.com/home');
            proxyReq.setHeader('Host', 'ant.aliceblueonline.com');
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
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('Origin', 'https://ant.aliceblueonline.com');
            proxyReq.setHeader('Referer', 'https://ant.aliceblueonline.com/home');
            proxyReq.setHeader('Host', 'ant.aliceblueonline.com');
          });
        }
      },
      '/NorenWS': {
        target: 'wss://ws2.aliceblueonline.com/NorenWS/',
        ws: true,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/NorenWS/, ''),
        headers: {
          'Origin': 'https://ant.aliceblueonline.com',
          'Referer': 'https://ant.aliceblueonline.com/home',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
          'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8,hi;q=0.7'
        },
        configure: (proxy) => {
          proxy.on('proxyReqWs', (proxyReq) => {
            proxyReq.setHeader('Origin', 'https://ant.aliceblueonline.com');
          });
        }
      }
    },
  },
})