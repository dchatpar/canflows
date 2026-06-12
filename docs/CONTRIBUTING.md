# Contributing to CanFlow.ai

Thank you for your interest in contributing! We welcome developers, government digital service teams, accessibility specialists, and compliance professionals.

## Code of Conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Bugs

1. Search [existing issues](https://github.com/canflow-ai/canflow/issues) first.
2. Open a new issue using the **Bug Report** template.
3. Include steps to reproduce, expected vs. actual behaviour, and environment details.

**Security vulnerabilities:** Do NOT open a public issue. See [SECURITY.md](SECURITY.md).

### Submitting Code

```bash
# 1. Fork and clone
git clone https://github.com/YOUR_USERNAME/canflow.git
cd canflow && pnpm install

# 2. Create a branch
git checkout -b feat/your-feature-name

# 3. Make changes, then verify
pnpm run typecheck
pnpm run lint
pnpm run build

# 4. Commit (Conventional Commits)
git commit -m "feat(forms): add date range field type"

# 5. Push and open a Pull Request
```

### Branch Naming

- `feat/` — new features
- `fix/` — bug fixes
- `docs/` — documentation
- `a11y/` — accessibility improvements
- `security/` — security fixes

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(module): short description
fix(sla): correct timer across DST boundaries
a11y(nav): improve keyboard focus indicators
docs(readme): update Docker instructions
```

## Development Guidelines

### TypeScript
- Strict mode enforced. Never use `any`, `@ts-ignore`, or `@ts-expect-error`.
- Prefer `satisfies` over `as` for type assertions.

### Accessibility
All UI must meet WCAG 2.1 Level AA:
- 4.5:1 colour contrast for normal text
- Keyboard navigable (no traps)
- Proper ARIA roles and labels
- Visible focus indicators

### Internationalization
All user-visible strings must be added to both English and French in `src/contexts/language-context.tsx`.

### Privacy
- No new third-party scripts/pixels without privacy review.
- New data collection requires a documented lawful basis under PIPEDA.
