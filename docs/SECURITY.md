# Security Policy

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

**Email:** security@canflow.ai  
**Response:** Acknowledged within 48 hours; assessed within 7 business days.

### What to Include

- Type of vulnerability (XSS, CSRF, privilege escalation, etc.)
- File paths and line numbers
- Steps to reproduce
- Proof of concept (if applicable)
- Impact assessment

### What to Expect

1. Acknowledgement within 48 hours.
2. Severity assessment within 7 business days.
3. Updates every 14 days until resolved.
4. Critical issues (auth bypass, data exposure) remediated within 72 hours.
5. Credit in release notes with your permission.

### Safe Harbour

We will not pursue legal action against researchers who report in good faith, do not access other users' data, and allow 90 days for remediation before public disclosure.

## Security Architecture

CanFlow.ai implements:
- AES-256 at rest, TLS 1.3 in transit
- Immutable audit logs for all privileged operations
- MFA for staff and admin accounts
- Canada data residency (AWS ca-central-1)
- Automated dependency vulnerability scanning on every commit
- Annual third-party penetration testing

Full details: [canflow.ai/trust](https://canflow.ai/trust)

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest (main) | Yes |
| Previous minor | Security fixes only |
| Older | No |

## PIPEDA Breach Notification

If you discover an active breach, contact security@canflow.ai immediately with "BREACH" in the subject line.
