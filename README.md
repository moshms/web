# Music Cloud Web

React SPA и nginx-образ Music Cloud.

- Vite + React + TypeScript.
- shadcn/ui, Tailwind CSS.
- В образ входят nginx-конфиги и entrypoint с TLS/HTTP переключением.

```bash
npm ci
npm run dev
npm run build
docker build -t ghcr.io/moshms/web:dev .
```

CI: сборка на всех ветках, образ `ghcr.io/moshms/web` — только по тегам `v*`.
