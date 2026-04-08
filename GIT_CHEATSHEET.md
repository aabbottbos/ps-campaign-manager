# Git Cheat Sheet - Quick Commands

**PS Campaign Manager - Security-Enhanced Workflow**

---

## 🚀 Daily Workflow (Copy & Paste)

### Start New Feature
```bash
git checkout main && git pull origin main
git checkout -b feature/my-feature
```

### Commit Changes
```bash
git add .
git status
git commit -m "feat: your change description"
```

### Merge & Push to GitHub
```bash
git checkout main
git merge feature/my-feature --no-ff
git push origin main
3my-feature
```

---

## 🔧 Common Operations

### Check Status
```bash
git status                    # What's changed
git diff                      # View changes
git log --oneline -5          # Recent commits
```

### Stage Files
```bash
git add .                     # Stage everything
git add file1.ts file2.tsx    # Stage specific files
git add -u                    # Stage modified only (no new files)
```

### Undo Things
```bash
git restore --staged file.ts  # Unstage file
git restore file.ts           # Discard changes
git reset HEAD~1              # Undo last commit (keep changes)
```

### Stash (Temporarily Save)
```bash
git stash                     # Save current work
git stash pop                 # Restore saved work
git stash list                # View stashed items
```

---

## 🔒 Pre-Commit Hooks

### Run Hooks Manually
```bash
pre-commit run --all-files               # Run all hooks
pre-commit run detect-secrets            # Check for secrets
```

### Fix Secret Detection Issues
```bash
# Update baseline for false positives
~/.cache/pre-commit/repoe8_15bes/py_env-python3.14/bin/detect-secrets scan --baseline .secrets.baseline
git add .secrets.baseline
```

### Hook Auto-Fixed Files
```bash
# If hooks modified files, just stage and recommit
git add .
git commit -m "your message"
```

---

## ⚠️ Troubleshooting

### "Don't commit to branch" Error
```bash
# You tried to commit to main - create a feature branch
git checkout -b feature/my-changes
git commit -m "your message"
```

### "Unstaged files detected"
```bash
# Stage everything including auto-fixes
git add -A
git commit -m "your message"
```

### "Secret detected"
```bash
# Option 1: Move secret to .env.local (RECOMMENDED)
# Option 2: Update baseline if false positive (see above)
# Option 3: Add "# pragma: allowlist secret" comment in file
```

### Forgot to Branch from Main
```bash
# On main with changes? Create branch (changes come with you)
git checkout -b feature/my-changes
git commit -m "your message"
```

---

## 📝 Commit Message Format

```
<type>: <description>

<optional details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Types:** `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`

---

## 🌿 Branch Names

- `feature/user-dropdown`
- `fix/linkedin-api-error`
- `refactor/ui-components`
- `docs/setup-guide`

---

## 🔍 Useful Aliases (Add to ~/.gitconfig)

```ini
[alias]
    st = status
    co = checkout
    br = branch
    cm = commit -m
    lg = log --oneline --graph --all -10
    undo = reset HEAD~1
    unstage = restore --staged
```

**Usage after adding aliases:**
```bash
git st              # git status
git co main         # git checkout main
git br              # git branch
git cm "message"    # git commit -m "message"
git lg              # pretty log graph
git undo            # undo last commit
```

---

## 💡 Pro Tips

1. **Always** `git status` before committing
2. **Always** work on feature branches
3. **Never** commit `.env.local` or secrets
4. **Review** `git diff --staged` before committing
5. **Pull** before merging: `git pull origin main`
6. **Use** `--no-ff` for merges to preserve history

---

## 🆘 Emergency Commands

### Bypass Hooks (Use Sparingly!)
```bash
git commit --no-verify -m "emergency fix"
```

### Force Push (Dangerous!)
```bash
git push --force-with-lease origin main
```

### Hard Reset (Destroys Changes!)
```bash
git reset --hard HEAD~1
```

---

**See GIT_WORKFLOW.md for detailed explanations**
