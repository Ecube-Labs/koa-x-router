import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        clearMocks: true,
        environment: 'node',
        exclude: [...configDefaults.exclude, 'test/package.test.cjs', 'codemods/**'],
        fileParallelism: false,
        coverage: {
            provider: 'v8',
        },
    },
});
