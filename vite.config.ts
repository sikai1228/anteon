import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { port: 5178, strictPort: true },
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        main: new URL('index.html', import.meta.url).pathname,
        tokens: new URL('tokens.html', import.meta.url).pathname,
        pricing: new URL('pricing.html', import.meta.url).pathname,
        support: new URL('support.html', import.meta.url).pathname,
        engine: new URL('engine.html', import.meta.url).pathname,
        api: new URL('api.html', import.meta.url).pathname,
        personal: new URL('personal.html', import.meta.url).pathname,
        apiKey: new URL('api-key.html', import.meta.url).pathname,
        about: new URL('about.html', import.meta.url).pathname,
        blog: new URL('blog.html', import.meta.url).pathname,
        contact: new URL('contact.html', import.meta.url).pathname,
        privacy: new URL('privacy.html', import.meta.url).pathname,
        terms: new URL('terms.html', import.meta.url).pathname,
        cookiePolicy: new URL('cookie-policy.html', import.meta.url).pathname,
      },
    },
  },
});
