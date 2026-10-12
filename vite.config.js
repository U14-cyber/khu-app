import { defineConfig } from 'vite';
import { reportsApi } from './server/api.js';

export default defineConfig({
  plugins: [reportsApi()],
  server: { host: true, port: 5173 },
});
