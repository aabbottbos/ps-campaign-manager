#!/bin/bash

# ─── PS Campaign Manager — Start Dev Services ───────────────────────────────

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="$SCRIPT_DIR/.pids"
LOG_DIR="$SCRIPT_DIR/.logs"

mkdir -p "$PID_DIR" "$LOG_DIR"

# ── Colors ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
RESET='\033[0m'

# ── Helpers ──────────────────────────────────────────────────────────────────
is_running() {
  local pid_file="$PID_DIR/$1.pid"
  if [ -f "$pid_file" ]; then
    local pid
    pid=$(cat "$pid_file")
    kill -0 "$pid" 2>/dev/null && return 0
  fi
  return 1
}

start_service() {
  local name="$1"
  local cmd="$2"
  local log="$LOG_DIR/$name.log"

  if is_running "$name"; then
    echo -e "${YELLOW}⚠  $name is already running (PID $(cat "$PID_DIR/$name.pid"))${RESET}"
    return
  fi

  echo -e "${CYAN}▶  Starting $name...${RESET}"
  eval "$cmd" >> "$log" 2>&1 &
  echo $! > "$PID_DIR/$name.pid"
  sleep 1

  if is_running "$name"; then
    echo -e "${GREEN}✓  $name started (PID $(cat "$PID_DIR/$name.pid")) — logs: .logs/$name.log${RESET}"
  else
    echo -e "${RED}✗  $name failed to start — check .logs/$name.log${RESET}"
  fi
}

# ── Pre-flight checks ────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}PS Campaign Manager — Dev Services${RESET}"
echo "────────────────────────────────────────"

# Check .env.local exists
if [ ! -f "$SCRIPT_DIR/.env.local" ]; then
  echo -e "${RED}✗  .env.local not found. Copy .env.example and fill in your values.${RESET}"
  exit 1
fi

# Check node_modules
if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
  echo -e "${YELLOW}⚠  node_modules missing — running npm install...${RESET}"
  npm install
fi

echo ""

# ── Start Services ───────────────────────────────────────────────────────────

# 1. Next.js dev server (port 3000)
start_service "nextjs" "npm run dev"

# 2. Inngest dev server (port 8288)
#    Connects to your local Next.js Inngest endpoint at /api/inngest
start_service "inngest" "npx inngest-cli@latest dev -u http://localhost:3000/api/inngest"

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "────────────────────────────────────────"
echo -e "${GREEN}Services started. URLs:${RESET}"
echo -e "  App:     ${CYAN}http://localhost:3000${RESET}"
echo -e "  Inngest: ${CYAN}http://localhost:8288${RESET}"
echo ""
echo -e "  Logs:    ${YELLOW}.logs/nextjs.log${RESET}"
echo -e "           ${YELLOW}.logs/inngest.log${RESET}"
echo ""
echo -e "  Stop:    ${YELLOW}./stop.sh${RESET}"
echo ""
