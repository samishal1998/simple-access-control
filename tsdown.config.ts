import { defineConfig } from 'tsdown'

export default defineConfig([
  // ESM build
  {
    entry: ['src/index.ts'],
    format: 'esm',
    dts: true,
    clean: true,
    outDir: 'dist/esm',
    target: 'es2020',
    minify: true,
    sourcemap: true,
  },
  // CJS build  
  {
    entry: ['src/index.ts'],
    format: 'cjs',
    dts: true,
    clean: false, // Don't clean for second build
    outDir: 'dist/cjs',
    target: 'es2020',
    minify: true,
    sourcemap: true
  }
])
