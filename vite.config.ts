import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { port: 5178, strictPort: true },
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        main: new URL('index.html', import.meta.url).pathname,
        credits: new URL('credits.html', import.meta.url).pathname,
        tokens: new URL('tokens.html', import.meta.url).pathname,
      },
    },
  },
});
