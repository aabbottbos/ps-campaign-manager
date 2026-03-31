#!/bin/bash

# ─── PS Campaign Manager — Stop Dev Services ────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="$SCRIPT_DIR/.pids"

# ── Colors ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
RESET='\033[0m'

echo ""
echo -e "${CYAN}PS Campaign Manager — Stopping Dev Services${RESET}"
echo "────────────────────────────────────────────"
echo ""

# ── Helpers ──────────────────────────────────────────────────────────────────
stop_service() {
  local name="$1"
  local pid_file="$PID_DIR/$name.pid"

  if [ ! -f "$pid_file" ]; then
    echo -e "${YELLOW}⚠  $name — no PID file found (already stopped?)${RESET}"
    return
  fi

  local pid
  pid=$(cat "$pid_file")

  if kill -0 "$pid" 2>/dev/null; then
    echo -e "${CYAN}■  Stopping $name (PID $pid)...${RESET}"
    kill "$pid" 2>/dev/null

    # Wait up to 5s for graceful shutdown
    local count=0
    while kill -0 "$pid" 2>/dev/null && [ $count -lt 10 ]; do
      sleep 0.5
      count=$((count + 1))
    done

    # Force kill if still running
    if kill -0 "$pid" 2>/dev/null; then
      echo -e "${YELLOW}  → Graceful shutdown timed out, force killing...${RESET}"
      kill -9 "$pid" 2>/dev/null
    fi

    echo -e "${GREEN}✓  $name stopped${RESET}"
  else
    echo -e "${YELLOW}⚠  $name (PID $pid) was not running${RESET}"
  fi

  rm -f "$pid_file"
}

# ── Stop Services (reverse order) ────────────────────────────────────────────
stop_service "inngest"
stop_service "nextjs"

# ── Clean up any orphaned processes on the ports ─────────────────────────────
echo ""
echo "  Checking for orphaned processes..."

for port in 3000 8288; do
  local_pid=$(lsof -ti tcp:$port 2>/dev/null)
  if [ -n "$local_pid" ]; then
    echo -e "${YELLOW}  ⚠  Orphaned process on port $port (PID $local_pid) — killing${RESET}"
    kill "$local_pid" 2>/dev/null || true
  fi
done

# ── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo "────────────────────────────────────────────"
echo -e "${GREEN}All services stopped.${RESET}"
echo ""
