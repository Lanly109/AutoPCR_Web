// 联调专用：关闭 HMR 文件监听（Docker/索引器碰工作区文件会令 chokidar EBUSY 崩溃退出）。
// 用法：node node_modules/vite/bin/vite.js --config scripts/vite.dev-no-watch.config.mts
// 常规开发请继续用默认 vite.config.ts。
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { TanStackRouterVite } from '@tanstack/router-vite-plugin';
import path from 'path';
import { readFileSync } from 'fs';

const version = JSON.parse(readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf-8')).version;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: '/daily',
    server: {
      proxy: {
        '/daily/api': {
          target: env.AUTOPCR_SERVER_HOST || 'http://localhost:13200',
          changeOrigin: true,
        },
      },
      host: env.AUTOPCR_WEBUI_LISTEN || 'localhost',
      watch: { ignored: ['**/autopcr/**', '**/audit/**', '**/scripts/**'] },
      hmr: false,
    },
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), 'src'),
        '@api': path.resolve(process.cwd(), 'src/api'),
        '@components': path.resolve(process.cwd(), 'src/components'),
        '@interfaces': path.resolve(process.cwd(), 'src/interfaces'),
        '@routes': path.resolve(process.cwd(), 'src/routes'),
      },
    },
    define: { APP_VERSION: JSON.stringify(version) },
    plugins: [react(), TanStackRouterVite()],
  };
});
