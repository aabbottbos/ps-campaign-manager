# Secrets Management Guide

This document outlines how secrets and sensitive credentials are managed in this project to prevent security incidents.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [File Structure](#file-structure)
- [Pre-Commit Hooks](#pre-commit-hooks)
- [Next.js Environment Variables](#nextjs-environment-variables)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### For New Developers

1. **Copy the example file:**
   ```bash
   cp .env.example .env.local
   ```

2. **Fill in your actual secrets:**
   Edit `.env.local` and replace all placeholder values with real credentials.
   Never use placeholder values in production!

3. **Verify pre-commit hooks are installed:**
   ```bash
   pre-commit install
   ```

4. **Test the hooks (optional):**
   ```bash
   pre-commit run --all-files
   ```

---

## File Structure

### ✅ Safe to Commit (Tracked by Git)

- **`.env.example`** - Template with placeholder values
  - Contains all required environment variable names
  - Uses safe placeholder values like `your-api-key-here`
  - Includes helpful comments and links to where to get credentials
  - **Purpose:** Onboarding documentation for new developers

### ❌ Never Commit (Ignored by Git)

- **`.env.local`** - Your actual secrets (local development)
  - Contains real API keys, passwords, and tokens
  - Automatically ignored by `.gitignore`
  - Highest priority in Next.js env loading order
  - **Purpose:** Local development credentials

- **`.env`** - REMOVED - Use `.env.local` instead
  - We removed this file to enforce single-source-of-truth
  - If you see a `.env` file, delete it immediately

### 🔒 Secret Detection

- **`.secrets.baseline`** - detect-secrets baseline (tracked)
  - Contains fingerprints of known false positives
  - Prevents false alarms for placeholder text
  - Updated when new safe patterns are added

- **`.pre-commit-config.yaml`** - Pre-commit hook configuration (tracked)
  - Defines which security hooks run before each commit
  - Prevents accidental secret commits

---

## Pre-Commit Hooks

### What They Do

Our pre-commit hooks automatically scan for secrets before every commit:

1. **detect-secrets** - Scans for API keys, passwords, tokens, etc.
2. **no-commit-to-branch** - Prevents direct commits to `main`
3. **check-case-conflict** - Prevents case-sensitive filename issues
4. **check-merge-conflict** - Detects unresolved merge conflicts
5. **check-added-large-files** - Blocks files larger than 500KB
6. **end-of-file-fixer** - Ensures files end with newline
7. **trailing-whitespace** - Removes trailing whitespace

### Installation

Hooks are automatically installed when you clone the repo, but you can reinstall:

```bash
pre-commit install
```

### Manual Testing

Run hooks on all files without committing:

```bash
pre-commit run --all-files
```

Run only the secret detection:

```bash
pre-commit run detect-secrets --all-files
```

### Bypassing Hooks (Emergency Only)

⚠️ **WARNING:** Only bypass hooks if you understand the consequences!

```bash
git commit --no-verify -m "message"
```

**When to bypass:**
- Never for secrets! If detect-secrets flags something, investigate it.
- Only for non-security hooks in emergency situations
- Document why in commit message

### Handling False Positives

If detect-secrets flags a false positive (like example code):

1. **Inline exception (preferred):**
   ```python
   # This is a placeholder example
   API_KEY = "your-api-key-here"  # pragma: allowlist secret
   ```

2. **Update baseline (for persistent patterns):**
   ```bash
   detect-secrets scan > .secrets.baseline
   git add .secrets.baseline
   ```

---

## Next.js Environment Variables

### Server-Side Only (Default)

All environment variables in Next.js are **server-side only** by default:

```typescript
// lib/api-client.ts (server-side)
const apiKey = process.env.API_KEY // ✅ Safe - only available on server
```

**Never exposed to the browser** ✅

### Client-Side (Explicit Opt-In)

To expose variables to the browser, prefix with `NEXT_PUBLIC_`:

```bash
# .env.local
NEXT_PUBLIC_APP_VERSION=1.0.0  # ⚠️ Visible in browser!
```

```typescript
// components/Footer.tsx (client component)
export function Footer() {
  return <div>Version: {process.env.NEXT_PUBLIC_APP_VERSION}</div>
}
```

### ⚠️ NEVER Use NEXT_PUBLIC_ for Secrets!

```bash
# ❌ WRONG - Exposed to all users!
NEXT_PUBLIC_API_KEY=sk-1234567890abcdef

# ✅ CORRECT - Server-side only
API_KEY=sk-1234567890abcdef
```

### Current Status

✅ **Verified:** This project has **ZERO** `NEXT_PUBLIC_` variables.
All secrets are properly server-side only.

---

## Best Practices

### ✅ DO

1. **Use .env.local for all local secrets**
   ```bash
   # .env.local
   DATABASE_URL=postgresql://user:pass@localhost/db  # pragma: allowlist secret
   API_KEY=sk-real-key-here
   ```

2. **Keep .env.example updated**
   - Add new variables to `.env.example` when you add features
   - Use descriptive placeholder values
   - Include comments explaining where to get credentials

3. **Generate strong secrets**
   ```bash
   # NextAuth secret
   openssl rand -base64 32

   # Random password
   openssl rand -hex 32
   ```

4. **Rotate exposed secrets immediately**
   - If a secret is committed, assume it's compromised
   - Rotate the secret at the provider (API dashboard)
   - Update `.env.local` with new value
   - Clean git history with `git-filter-repo`

5. **Use environment-specific secrets**
   - Development: `.env.local` (local machine)
   - Production: Vercel Environment Variables (dashboard)
   - Never share secrets between environments

6. **Review all changes before committing**
   ```bash
   git diff  # Check what you're about to stage
   git diff --staged  # Check what you're about to commit
   ```

### ❌ DON'T

1. **Never commit .env.local**
   - Already in `.gitignore`, but double-check!
   - Run: `git status` before committing

2. **Never hardcode secrets in code**
   ```typescript
   // ❌ WRONG
   const apiKey = "sk-1234567890abcdef"  // pragma: allowlist secret

   // ✅ CORRECT
   const apiKey = process.env.API_KEY
   ```

3. **Never put secrets in documentation**
   ```markdown
   <!-- ❌ WRONG -->
   Our API key is: sk-1234567890abcdef

   <!-- ✅ CORRECT -->
   Set your API key in .env.local as API_KEY
   ```

4. **Never share .env.local files**
   - Don't send via Slack, email, or chat
   - Use secure password managers (1Password, Bitwarden)
   - Or use secure secret sharing services (e.g., Doppler)

5. **Never use weak placeholder values**
   ```bash
   # ❌ WRONG - Could be mistaken for real
   API_KEY=12345

   # ✅ CORRECT - Obviously fake
   API_KEY=your-api-key-here
   ```

6. **Never bypass pre-commit hooks for secrets**
   - If detect-secrets blocks you, investigate why
   - Don't use `--no-verify` to skip checks

---

## Troubleshooting

### Pre-commit hook blocking legitimate code

If the hook flags a false positive:

```bash
# Add inline exception
echo "password = 'example123'  # pragma: allowlist secret" >> file.py

# Or update baseline
detect-secrets scan > .secrets.baseline
git add .secrets.baseline
```

### Accidentally committed a secret

1. **DO NOT** just remove it in a new commit - it's still in history!

2. **Rotate the secret immediately** at the provider

3. **Clean git history:**
   ```bash
   # If not pushed yet
   git reset --soft HEAD~1  # Undo commit but keep changes

   # If already pushed - contact security team
   # Need to use git-filter-repo to rewrite history
   ```

4. **See HANDOFF.md** for full git history cleaning process

### Need to add a new environment variable

1. Add to `.env.local` with real value
2. Add to `.env.example` with placeholder
3. Update this documentation if it's a new category
4. Update `HANDOFF.md` if required for deployment

### Pre-commit hooks not running

```bash
# Reinstall hooks
pre-commit install

# Test manually
pre-commit run --all-files

# Check installation
ls -la .git/hooks/pre-commit
```

### Getting "Unable to read baseline" error

```bash
# Regenerate baseline
detect-secrets scan > .secrets.baseline

# Or use pre-commit's version
~/.cache/pre-commit/*/py_env-python3*/bin/detect-secrets scan > .secrets.baseline
```

---

## Environment Variable Categories

### Required for Local Development

- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Session signing key
- `NEXTAUTH_URL` - Application URL (http://localhost:3000)
- `GOOGLE_CLIENT_ID` - OAuth client ID
- `GOOGLE_CLIENT_SECRET` - OAuth client secret
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob storage token

### Required for Specific Features

- **Sprint 3 (Enrichment):**
  - `APIFY_API_TOKEN` - Apify enrichment service
  - `INNGEST_EVENT_KEY` - Inngest background jobs
  - `INNGEST_SIGNING_KEY` - Inngest webhook signature

- **Sprint 4 (AI Messages):**
  - `ANTHROPIC_API_KEY` - Claude AI for message generation

- **Sprint 5 (Salesforce):**
  - `SALESFORCE_CLIENT_ID`
  - `SALESFORCE_CLIENT_SECRET`
  - `SALESFORCE_REFRESH_TOKEN`
  - `SALESFORCE_INSTANCE_URL`

- **Sprint 6 (SalesLoft):**
  - `SALESLOFT_API_KEY`

- **Sprint 7 (LinkedIn):**
  - `UNIPILE_API_KEY`
  - `UNIPILE_BASE_URL`

---

## Security Incident Response

If secrets are exposed:

1. **Immediately rotate** all exposed credentials
2. **Notify team lead** or security contact
3. **Clean git history** using `git-filter-repo`
4. **Force push** cleaned history (coordinate with team)
5. **Update documentation** with incident details
6. **Review logs** for unauthorized access
7. **Implement additional controls** to prevent recurrence

---

## Additional Resources

- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [detect-secrets Documentation](https://github.com/Yelp/detect-secrets)
- [pre-commit Framework](https://pre-commit.com/)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [git-filter-repo Documentation](https://github.com/newren/git-filter-repo)

---

## Questions?

If you have questions about secrets management:

1. Check this document first
2. Review `.env.example` for examples
3. Check `HANDOFF.md` for deployment specifics
4. Ask in the team chat or create an issue

**Remember:** When in doubt, ask! Better to clarify than to accidentally expose secrets.
