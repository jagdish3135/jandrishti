import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `vite build --mode snapshot` makes one self-contained HTML file (hash routing, everything inlined)
// that opens straight from disk. Normal builds are the regular multi-file site.
export default defineConfig(({ mode }) => ({
  plugins: mode === 'snapshot' ? [react(), viteSingleFile()] : [react()],
  define: { 'import.meta.env.VITE_SNAPSHOT': JSON.stringify(mode === 'snapshot') },
  build: mode === 'snapshot' ? { outDir: 'dist-snapshot', emptyOutDir: true } : {},
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
}) as never);
