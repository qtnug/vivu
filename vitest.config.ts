import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 20000,
    hookTimeout: 20000,
    pool: 'threads',
    projects: [
      {
        test: {
          name: 'db',
          testTimeout: 35000,
          hookTimeout: 35000,
          include: [
            'tests/tier2-boundary/boundary-schema-constraints.test.ts',
            'tests/adversarial/db-stress.test.ts',
          ],
        },
      },
      {
        test: {
          name: 'api',
          include: [
            'tests/tier1-features/**/*.test.ts',
            'tests/tier2-boundary/**/*.test.ts',
          ],
          exclude: [
            'tests/tier2-boundary/boundary-schema-constraints.test.ts',
          ],
        },
      },
      {
        test: {
          name: 'e2e',
          include: [
            'tests/tier3-interactions/**/*.test.ts',
            'tests/tier4-scenarios/**/*.test.ts',
          ],
        },
      },
    ],
  },
});
