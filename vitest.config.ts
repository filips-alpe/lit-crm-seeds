import { defineConfig } from 'vitest/config';

// The extension's own tests import lit-crm code ($lib/...), so they run inside
// lit-crm once the extension is installed. Only the data pipeline and loader
// are tested here.
export default defineConfig({
  test: { include: ['seed/**/*.test.ts'], expect: { requireAssertions: true } },
});
