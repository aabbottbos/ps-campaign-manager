# Git Workflow Guide

**Security-Enhanced Git Workflow for PS Campaign Manager**

This guide covers the git commands and workflow for this project, which includes pre-commit hooks for secret detection and branch protection rules.

---

## 📋 Table of Contents

1. [Quick Reference](#quick-reference)
2. [Daily Workflow](#daily-workflow)
3. [Pre-Commit Hooks](#pre-commit-hooks)
4. [Troubleshooting](#troubleshooting)
5. [Advanced Operations](#advanced-operations)

---

## Quick Reference

### Most Common Commands

```bash
# Start new feature
git checkout -b feature/your-feature-name

# Check what you're about to commit
git status
git diff

# Stage and commit (hooks run automatically)
git add .
git commit -m "your commit message"

# Merge to main and push
git checkout main
git merge feature/your-feature-name --no-ff
git push origin main

# Clean up
git branch -d feature/your-feature-name
```

---

## Daily Workflow

### 1. Starting a New Feature

**Always work on a feature branch** (direct commits to `main` are blocked by pre-commit hooks).

```bash
# Make sure you're on main and up to date
git checkout main
git pull origin main

# Create and switch to a new feature branch
git checkout -b feature/your-feature-name
```

**Branch naming conventions:**
- `feature/` - New features (e.g., `feature/user-dropdown`)
- `fix/` - Bug fixes (e.g., `fix/linkedin-sending`)
- `refactor/` - Code refactoring (e.g., `refactor/ui-components`)
- `docs/` - Documentation only (e.g., `docs/api-guide`)

### 2. Making Changes

```bash
# Check current status
git status

# View unstaged changes
git diff

# View staged changes
git diff --staged

# Stage specific files
git add path/to/file1.tsx path/to/file2.ts

# Stage all changes
git add .

# Stage only modified/deleted files (skip untracked)
git add -u
```

### 3. Committing Changes

**Pre-commit hooks will run automatically when you commit.**

```bash
# Commit with message
git commit -m "feat: add user profile dropdown with settings link"

# Commit with detailed message (opens editor)
git commit
```

**Commit message format:**
```
<type>: <short description>

<optional detailed description>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code refactoring
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `test:` - Adding tests
- `chore:` - Maintenance tasks

### 4. Merging to Main

```bash
# Switch to main
git checkout main

# Pull latest changes (if working with a team)
git pull origin main

# Merge your feature branch (--no-ff preserves merge history)
git merge feature/your-feature-name --no-ff

# If you want a custom merge commit message
git merge feature/your-feature-name --no-ff -m "Merge branch 'feature/your-feature-name'

Brief description of what this merge adds.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### 5. Pushing to GitHub

```bash
# Push main to GitHub
git push origin main

# If you want to push your feature branch first (for backup or PR)
git checkout feature/your-feature-name
git push origin feature/your-feature-name
```

### 6. Cleaning Up

```bash
# Delete local feature branch (after merging)
git branch -d feature/your-feature-name

# Delete remote feature branch (if you pushed it)
git push origin --delete feature/your-feature-name

# View all branches
git branch -a
```

---

## Pre-Commit Hooks

### What Runs Automatically

When you run `git commit`, these hooks execute:

1. **detect-secrets** - Scans for exposed secrets (API keys, passwords, tokens)
2. **no-commit-to-branch** - Blocks direct commits to `main` branch
3. **check-case-conflict** - Prevents filename case conflicts
4. **check-merge-conflict** - Detects unresolved merge conflicts
5. **check-added-large-files** - Blocks files >500KB
6. **end-of-file-fixer** - Ensures files end with newline
7. **trailing-whitespace** - Removes trailing whitespace

### If Hooks Block Your Commit

**Secret detected:**
```bash
# Example error:
# ERROR: Potential secrets about to be committed to git repo!
# Secret Type: Secret Keyword
# Location:    app/config.ts:15

# Option 1: Remove the secret (RECOMMENDED)
# Edit the file and move secret to .env.local

# Option 2: Add to baseline if it's a false positive
~/.cache/pre-commit/repoe8_15bes/py_env-python3.14/bin/detect-secrets scan --baseline .secrets.baseline
git add .secrets.baseline
git commit -m "your message"

# Option 3: Add inline pragma comment (for documentation)
# In the file, add: # pragma: allowlist secret
# Then commit normally
```

**Trying to commit to main:**
```bash
# ERROR: don't commit to branch...Failed
# - hook id: no-commit-to-branch

# Solution: Create a feature branch
git checkout -b feature/my-changes
git commit -m "your message"
```

**File too large:**
```bash
# ERROR: check for added large files...Failed

# Solution: Remove the file or add to .gitignore
git rm --cached path/to/large-file.zip
echo "path/to/large-file.zip" >> .gitignore
git commit -m "your message"
```

### Running Hooks Manually

```bash
# Run all hooks on all files
pre-commit run --all-files

# Run specific hook
pre-commit run detect-secrets --all-files
pre-commit run trailing-whitespace --all-files

# Run hooks on staged files only
pre-commit run
```

### Bypassing Hooks (Emergency Only)

```bash
# Skip ALL pre-commit hooks
git commit --no-verify -m "emergency fix"

# ⚠️ WARNING: Only use in emergencies!
# This bypasses security checks and should be avoided.
```

---

## Troubleshooting

### Issue: Hooks Modified My Files

**What happened:** Hooks like `end-of-file-fixer` and `trailing-whitespace` auto-fix issues.

**Solution:**
```bash
# The hooks already fixed the files, just stage them
git add .

# Commit again (hooks will pass now)
git commit -m "your message"
```

### Issue: Unstaged Files Conflict with Hook Fixes

**Error message:**
```
[WARNING] Unstaged files detected.
[WARNING] Stashed changes conflicted with hook auto-fixes... Rolling back fixes...
```

**Solution:**
```bash
# Stage ALL changes (including what hooks want to fix)
git add -A

# Commit again
git commit -m "your message"
```

### Issue: Forgot to Create Feature Branch

**You're on main and made changes:**
```bash
# Check current branch
git branch

# If on main with uncommitted changes:
# Option 1: Stash, branch, unstash
git stash
git checkout -b feature/my-changes
git stash pop

# Option 2: Create branch (keeps changes)
git checkout -b feature/my-changes
# Changes come with you automatically

# Now commit normally
git commit -m "your message"
```

### Issue: Need to Update .secrets.baseline

**When:** Documentation files trigger false positives.

```bash
# Update baseline with current scan
~/.cache/pre-commit/repoe8_15bes/py_env-python3.14/bin/detect-secrets scan --baseline .secrets.baseline

# Stage the updated baseline
git add .secrets.baseline

# Commit (will pass now)
git commit -m "your message"
```

### Issue: Merge Conflicts

```bash
# During merge, if conflicts occur:
git merge feature/my-branch

# Fix conflicts in files manually
# Then:
git add .
git commit -m "Merge branch 'feature/my-branch'"
```

---

## Advanced Operations

### Viewing Commit History

```bash
# Short log (one line per commit)
git log --oneline -10

# Detailed log
git log -5

# Graph view with branches
git log --oneline --graph --all -10

# Files changed in each commit
git log --stat -5
```

### Undoing Changes

```bash
# Unstage a file (keep changes)
git restore --staged path/to/file.ts

# Discard uncommitted changes to a file
git restore path/to/file.ts

# Undo last commit (keep changes staged)
git reset --soft HEAD~1

# Undo last commit (unstage changes but keep them)
git reset HEAD~1

# Undo last commit (discard changes - DANGEROUS)
git reset --hard HEAD~1
```

### Working with Remote

```bash
# View remote URLs
git remote -v

# Fetch updates without merging
git fetch origin

# Pull and rebase instead of merge
git pull --rebase origin main

# Push with force (CAREFUL - rewrites history)
git push --force-with-lease origin main
```

### Stashing Changes

```bash
# Stash current changes
git stash

# Stash with message
git stash save "WIP: working on dropdown"

# List stashes
git stash list

# Apply most recent stash (keep stash)
git stash apply

# Apply and remove stash
git stash pop

# Apply specific stash
git stash apply stash@{1}

# Drop stash
git stash drop stash@{0}
```

### Cherry-Picking Commits

```bash
# Apply a specific commit from another branch
git cherry-pick <commit-sha>

# Cherry-pick without committing
git cherry-pick --no-commit <commit-sha>
```

---

## Complete Example Workflow

Here's a full example from start to finish:

```bash
# 1. Start fresh
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feature/user-settings-dropdown

# 3. Make changes
# ... edit files ...

# 4. Check what changed
git status
git diff

# 5. Stage changes
git add components/layout/header.tsx

# 6. Commit (hooks run automatically)
git commit -m "feat: add user profile dropdown with settings link

Added clickable dropdown menu to user name in header.
Includes Settings link and moved Sign out into dropdown.
Implements click-outside detection and smooth animations.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# 7. Merge to main
git checkout main
git merge feature/user-settings-dropdown --no-ff

# 8. Push to GitHub
git push origin main

# 9. Clean up
git branch -d feature/user-settings-dropdown

# 10. Verify
git log --oneline -3
```

---

## Environment-Specific Notes

### .env Files - NEVER COMMIT

```bash
# These should NEVER be staged:
.env.local          # Your real secrets
.env.production     # Production secrets
.env.development    # Development secrets

# This is safe to commit:
.env.example        # Template with placeholders

# Check if .env files are ignored:
git check-ignore .env.local

# If accidentally staged:
git rm --cached .env.local
git commit -m "remove .env.local from tracking"
```

---

## Quick Troubleshooting Checklist

- ✅ Are you on a feature branch? (`git branch`)
- ✅ Did you stage your changes? (`git status`)
- ✅ Did the hooks pass? (Check commit output)
- ✅ Are there merge conflicts? (`git status` shows conflicts)
- ✅ Is your baseline up to date? (For false positives)
- ✅ Did you pull latest main before merging? (`git pull origin main`)

---

## Getting Help

```bash
# Git help for any command
git help commit
git help merge
git help stash

# Pre-commit help
pre-commit --help

# View pre-commit configuration
cat .pre-commit-config.yaml

# View secrets baseline
cat .secrets.baseline
```

---

**Last Updated:** April 3, 2026
**For:** PS Campaign Manager
**Security Level:** Enhanced with pre-commit hooks and secret detection
