# Deployment Guide

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Browser     │────▶│  Nginx (SPA)      │     │  Convex Cloud    │
│  (React SPA) │     │  :80 → dist/     │────▶│  (DB + Backend)  │
└─────────────┘     └──────────────────┘     └─────────────────┘
                           │
                    HTTPS / TLS (optional)
                    (load balancer / reverse proxy)
```

## Docker Deployment (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/dchatpar/canflows.git
cd canflows

# 2. Configure environment variables
cp .env.example .env
# Edit .env with your production values:
#   VITE_CONVEX_URL         — Your Convex deployment URL
#   VITE_HERCULES_OIDC_*    — Hercules Auth credentials
#   VITE_APP_URL            — Public URL of the app

# 3. Build and start
docker compose up --build -d

# App will be available at http://localhost:3000
```

### Docker Compose Configuration

The `docker-compose.yml` file runs the Nginx-based SPA server. It expects:

- **Build args**: `VITE_CONVEX_URL`, `VITE_HERCULES_OIDC_AUTHORITY`, `VITE_HERCULES_OIDC_CLIENT_ID`, `VITE_APP_URL`
- **Port**: `3000:80` (maps container port 80 to host port 3000)
- **Health check**: Hits `/health` every 30s

> **Note:** The Convex backend is a managed cloud service at [convex.dev](https://convex.dev). It is not self-hostable via this Docker setup. Deploy Convex functions separately with `pnpm exec convex deploy`.

## Manual Deployment

### Build the frontend

```bash
pnpm install
pnpm run build        # outputs to dist/
```

The `dist/` directory contains the complete static SPA. Serve it with any web server.

### Serve with Nginx

Copy `dist/` to your web root and use the provided `deploy/nginx.conf` configuration. Key features:

- SPA fallback routing
- Security headers (CSP, X-Frame-Options, etc.)
- Gzip compression
- Long-term asset caching for `/assets/`
- Health check endpoint at `/health`

### Deploy Convex Backend

```bash
pnpm exec convex deploy
```

Requires `CONVEX_DEPLOY_KEY` environment variable set in your deployment environment.

## Environment Variables

See [docs/ENVIRONMENT.md](ENVIRONMENT.md) and `.env.example` for the full list.

## CI/CD

The repository includes two GitHub Actions workflows:

### CI (`ci.yml`)
Runs on every push to `main`/`develop` and on pull requests:
- TypeScript type-checking (Vite + Convex)
- ESLint
- Prettier formatting check
- Vite production build

### Deploy (`deploy.yml`)
Runs on pushes to `main`:
- Deploys Convex functions via `convex deploy`
- Builds the Vite frontend
- (Deployment to your hosting provider — uncomment the appropriate step)

## Production Checklist

- [ ] Configure Convex deployment and set `VITE_CONVEX_URL`
- [ ] Set up Hercules Auth and configure OIDC credentials
- [ ] Enable HTTPS/TLS at your load balancer or reverse proxy
- [ ] Uncomment `Strict-Transport-Security` header in `deploy/nginx.conf`
- [ ] Configure `Content-Security-Policy` with your specific asset domains
- [ ] Set up monitoring and alerting for the health endpoint
- [ ] Configure secrets management (GitHub Actions secrets, Docker secrets, or your vault)
