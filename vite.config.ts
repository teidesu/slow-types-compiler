/// <reference types="vitest" />
import { defineConfig } from 'vite'

export default defineConfig({
    test: {
        include: [
            'src/**/*.test.ts',
            'tests/**/*.test.ts',
        ],
    },
    build: {
        lib: {
            entry: {
                index: './src/index.ts',
                cli: './src/cli.ts',
            },
            formats: ['es', 'cjs'],
        },
        minify: false,
        outDir: './dist',
        emptyOutDir: true,
    },
})
