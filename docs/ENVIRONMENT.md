# Environment Variables Reference

See `.env.example` in the repository root for a template with all variables documented.

## Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_CONVEX_URL` | Convex deployment URL | `https://your-deployment.convex.cloud` |
| `VITE_HERCULES_OIDC_AUTHORITY` | Hercules Auth OIDC authority URL | `https://your-app-id.hercules-auth.com` |
| `VITE_HERCULES_OIDC_CLIENT_ID` | Hercules Auth client ID | `your-client-id` |
| `HERCULES_OIDC_AUTHORITY` | Server-side OIDC authority | Same as VITE_ value |
| `HERCULES_OIDC_CLIENT_ID` | Server-side client ID | Same as VITE_ value |
| `HERCULES_API_KEY` | Hercules API key for AI Gateway | `hrc_...` |

## Optional Variables

| Variable | Description |
|----------|-------------|
| `VITE_APP_URL` | Public app URL for QR code / link generation |
| `OPENAI_API_KEY` | OpenAI key (only if bypassing Hercules AI Gateway) |
| `ANTHROPIC_API_KEY` | Anthropic key (only if bypassing Hercules AI Gateway) |

## Security Notes

- Never commit `.env`, `.env.local`, or `.env.production` to version control.
- These files are listed in `.gitignore`.
- In production, inject environment variables via your CI/CD system or Docker secrets — never bake them into images.
- The `HERCULES_API_KEY` and `HERCULES_OIDC_*` values are managed in the Hercules App Builder under Settings → Secrets.
