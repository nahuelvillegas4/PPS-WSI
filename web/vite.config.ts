import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// In development the gateway (docker compose) answers /api and /tiles on this origin.
const gateway = 'http://localhost:8080';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': gateway, '/tiles': gateway },
    // The tests read the numeric cases of the contract, which live outside web/.
    fs: { allow: ['..'] },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
