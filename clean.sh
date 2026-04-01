#!/bin/bash

# ─── PS Campaign Manager — Clean Restart ────────────────────────────────────
# Fixes: corrupted build cache, missing error components, webpack stale cache
# Run this whenever the dev server throws unexpected errors on startup

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="$SCRIPT_DIR/.pids"
LOG_DIR="$SCRIPT_DIR/.logs"

# ── Colors ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
RESET='\033[0m'

echo ""
echo -e "${CYAN}PS Campaign Manager — Clean Restart${RESET}"
echo "────────────────────────────────────────"
echo ""

# ── Step 1: Stop all running services ────────────────────────────────────────
echo -e "${CYAN}[1/5] Stopping running services...${RESET}"

stop_pid() {
  local name="$1"
  local pid_file="$PID_DIR/$name.pid"
  if [ -f "$pid_file" ]; then
    local pid
    pid=$(cat "$pid_file")
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null
      sleep 1
      kill -9 "$pid" 2>/dev/null || true
    fi
    rm -f "$pid_file"
  fi
}

stop_pid "nextjs"
stop_pid "inngest"

# Kill anything still on the ports
for port in 3000 8288; do
  pid=$(lsof -ti tcp:$port 2>/dev/null)
  if [ -n "$pid" ]; then
    kill -9 "$pid" 2>/dev/null || true
  fi
done

echo -e "${GREEN}✓  Services stopped${RESET}"

# ── Step 2: Clear Next.js build cache ────────────────────────────────────────
echo -e "${CYAN}[2/5] Clearing build cache...${RESET}"

rm -rf "$SCRIPT_DIR/.next"
echo -e "${GREEN}✓  .next cache cleared${RESET}"

# ── Step 3: Clear webpack + misc caches ──────────────────────────────────────
echo -e "${CYAN}[3/5] Clearing webpack + node caches...${RESET}"

rm -rf "$SCRIPT_DIR/.cache"
rm -rf "$SCRIPT_DIR/node_modules/.cache"

# Clear log files so next session starts fresh
rm -f "$LOG_DIR/nextjs.log"
rm -f "$LOG_DIR/inngest.log"

echo -e "${GREEN}✓  Caches cleared${RESET}"

# ── Step 4: Reinstall dependencies ───────────────────────────────────────────
echo -e "${CYAN}[4/5] Reinstalling dependencies...${RESET}"

cd "$SCRIPT_DIR" && npm install --silent

if [ $? -ne 0 ]; then
  echo -e "${RED}✗  npm install failed — check output above${RESET}"
  exit 1
fi

echo -e "${GREEN}✓  Dependencies reinstalled${RESET}"

# ── Step 5: Start services fresh ─────────────────────────────────────────────
echo -e "${CYAN}[5/5] Starting services...${RESET}"
echo ""

exec "$SCRIPT_DIR/start.sh"
