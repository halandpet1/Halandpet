import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'src/actions/auth.actions.ts',
        'src/lib/action-utils.ts',
        'src/lib/logger.ts',
        'src/lib/session.ts',
        'src/app/api/health/route.ts',
        'src/app/api/live/route.ts',
        'src/app/api/ready/route.ts',
        'src/middleware.ts',
      ],
      thresholds: {
        lines: 20,
        functions: 20,
        branches: 20,
        statements: 20,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
