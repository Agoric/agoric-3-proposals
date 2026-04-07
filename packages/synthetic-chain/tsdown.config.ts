import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/cli/cli.ts', 'src/lib/index.ts'],
  format: ['esm'],
  dts: true, // Generate declaration file (.d.ts)
  sourcemap: true,
  clean: true,
  // tsup's `publicDir: true` flattened public/ contents into the outDir.
  // tsdown's `copy: ['public']` would nest them under dist/public/ instead,
  // so list each item explicitly with an explicit destination to preserve
  // the historical layout that the CLI code (e.g. cp dist/docker-bake.hcl)
  // depends on.
  copy: [
    { from: 'public/docker-bake.hcl', to: 'dist' },
    { from: 'public/upgrade-test-scripts', to: 'dist' },
  ],
});
