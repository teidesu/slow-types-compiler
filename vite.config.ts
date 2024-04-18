/// <reference types="vitest" />
import { defineConfig } from 'vite'
import { nodeExternals } from 'rollup-plugin-node-externals'
import dts from 'vite-plugin-dts'

export default defineConfig({
    test: {
        include: [
            'src/**/*.test.ts',
            'tests/**/*.test.ts',
        ],
    },
    build: {
        rollupOptions: {
            plugins: [
                nodeExternals(),
            ],
        },
        lib: {
            entry: {
                index: './src/index.ts',
                cli: './src/cli.ts',
                worker: './src/utils/lib-downloader-worker.ts',
            },
            formats: ['es'],
        },
        minify: false,
        outDir: './dist',
        emptyOutDir: true,
    },
    plugins: [
        dts(),
    ],
})
