# Vercel Fix

The failed deploy happened because Vercel detected `pnpm-lock.yaml`, ran `pnpm install`, and pnpm refused to install because the lockfile was outdated relative to `package.json`.

This package fixes that by:

- Removing `pnpm-lock.yaml`
- Removing `packageManager` that forces pnpm
- Adding `vercel.json` that forces npm:
  - `npm install --legacy-peer-deps`
  - `npm run build`
  - output directory: `dist`
- Adding `.npmrc` with `legacy-peer-deps=true`

## Local test

```bash
npm install --legacy-peer-deps
npm run build
```

## Deploy

Upload this version to GitHub and redeploy on Vercel.
