#!/bin/bash

# Git Local Commit Script
# Commits all changes to the local repository

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}           Git Local Commit Script                      ${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}✗ Not a git repository${NC}"
    exit 1
fi

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${BLUE}Current branch:${NC} $CURRENT_BRANCH"
echo ""

# Show current status
echo -e "${YELLOW}Git Status:${NC}"
git status --short
echo ""

# Check if there are any changes
if git diff-index --quiet HEAD --; then
    echo -e "${GREEN}✓ No changes to commit${NC}"
    exit 0
fi

# Show detailed diff
echo -e "${YELLOW}Changes to be committed:${NC}"
echo ""
git --no-pager diff --stat
echo ""

# Ask for confirmation
echo -ne "${YELLOW}Review the changes above. Continue with commit? [y/N]: ${NC}"
read -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Commit cancelled${NC}"
    exit 0
fi

# Get commit message
echo ""
echo -e "${BLUE}Enter commit message:${NC}"
echo -e "${YELLOW}(Press Enter for multi-line, type 'END' on a new line when done)${NC}"
echo ""

# Read multi-line commit message
COMMIT_MSG=""
while IFS= read -r line; do
    if [ "$line" = "END" ]; then
        break
    fi
    if [ -n "$COMMIT_MSG" ]; then
        COMMIT_MSG="$COMMIT_MSG
$line"
    else
        COMMIT_MSG="$line"
    fi
done

# Check if message is empty
if [ -z "$COMMIT_MSG" ]; then
    echo -e "${RED}✗ Commit message cannot be empty${NC}"
    exit 1
fi

# Add all changes
echo ""
echo -e "${YELLOW}Staging all changes...${NC}"
git add .

# Show what will be committed
echo ""
echo -e "${YELLOW}Files to be committed:${NC}"
git --no-pager diff --cached --name-status
echo ""

# Create the commit
echo -e "${YELLOW}Creating commit...${NC}"
git commit -m "$COMMIT_MSG

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ Commit successful${NC}"
    echo ""

    # Show the commit
    echo -e "${BLUE}Commit details:${NC}"
    git --no-pager log -1 --stat
    echo ""

    # Show local vs remote status
    echo -e "${BLUE}Branch status:${NC}"
    git status -sb
    echo ""

    echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}Changes committed locally on branch: $CURRENT_BRANCH${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}To push to remote, run:${NC}"
    echo -e "  ./git_remote.sh"
    echo ""
else
    echo ""
    echo -e "${RED}✗ Commit failed${NC}"
    echo -e "${YELLOW}Check the error messages above${NC}"
    exit 1
fi
