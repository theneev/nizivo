#!/bin/bash
# SessionStart hook: installs the workspace's dependencies in a cloud session when the lockfile or
# a package.json changed since the last install. Does nothing outside the cloud.
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0
export PATH=/opt/node24/bin:$PATH COREPACK_ENABLE_DOWNLOAD_PROMPT=0 TURBO_TELEMETRY_DISABLED=1
cd "$CLAUDE_PROJECT_DIR" || exit 1
hashes=node_modules/.cloud-install.sha256
inputs() { git ls-files pnpm-lock.yaml pnpm-workspace.yaml .claude/hooks/cloud-install.sh '*package.json'; }
if ! sha256sum --check --status "$hashes" 2>/dev/null; then
  rm -f "$hashes"
  if corepack pnpm@12.11.2 install --frozen-lockfile > /tmp/cloud-install.log 2>&1; then
    inputs | xargs sha256sum > "$hashes" || rm -f "$hashes"
    echo "dependencies installed (log: /tmp/cloud-install.log)"
  else
    echo "pnpm install failed; see /tmp/cloud-install.log"
  fi
fi
exit 0
