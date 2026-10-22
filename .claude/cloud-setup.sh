#!/bin/bash
# The setup script for a Nizivo cloud environment (claude.ai/code → the environment's settings →
# Setup script): paste this file's contents there. It runs as root on Ubuntu before Claude starts,
# and its result is cached for about seven days. It needs the network level "Custom" with the
# default list plus nodejs.org, cdn.playwright.dev and playwright.download.prss.microsoft.com.
# Dependencies are installed per session by .claude/hooks/cloud-install.sh, not here.
set -u
NODE=24.16.0
PLAYWRIGHT=1.64.0 # pnpm-workspace.yaml's catalog

# Node 24 (the repo's engines field; the image has 20 to 22), first on PATH for every shell
install_node() {
  mkdir -p /opt/node24 &&
    curl -fsSL "https://nodejs.org/dist/v$NODE/node-v$NODE-linux-x64.tar.xz" |
    tar -xJ -C /opt/node24 --strip-components=1
}
# The browsers the specs use, with their system packages, at the version the lockfile pins
install_browsers() {
  /opt/node22/bin/npx -y "playwright@$PLAYWRIGHT" install --with-deps chromium firefox webkit
}

install_node &
node_job=$!
install_browsers &
browsers_job=$!
wait $node_job || { echo "Node $NODE did not install: is nodejs.org allowed?"; exit 1; }
wait $browsers_job || echo "Playwright browsers did not install: are the Playwright hosts allowed?"

echo 'export PATH=/opt/node24/bin:$PATH' > /etc/profile.d/node24.sh
grep -q /opt/node24 /root/.bashrc 2>/dev/null || echo 'export PATH=/opt/node24/bin:$PATH' >> /root/.bashrc
export PATH=/opt/node24/bin:$PATH
# Fetch pnpm once so sessions do not; corepack ships with Node 24
COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack pnpm@12.11.2 --version || true
exit 0
