#!/bin/sh
# Re-apply CN Webify local patches after `docker compose up -d --force-recreate`.
# Idempotent — safe to run any time.
#
# Patches:
#   1. /app/dist/src/git/git-sync.js — pass -c safe.directory=* and
#      HOME/GIT_CONFIG_* env vars so file:// clones don't trip git's
#      "dubious ownership" check on host-mounted repos (host uid 1000
#      vs container uid 999).
#   2. /home/reporelay/.gitconfig — write owned by uid 999 so git trusts
#      its `[safe] directory = *` setting.
set -eu
cd "$(dirname "$0")"

for svc in worker web; do
  docker compose exec -u 0 "$svc" sh -ec '
    if ! grep -q "safe.directory=\*" /app/dist/src/git/git-sync.js; then
      sed -i "s|config: \[\"credential.helper=\"\]|config: [\"credential.helper=\", \"safe.directory=*\"]|" /app/dist/src/git/git-sync.js
    fi
    if ! grep -q "HOME: \"/home/reporelay\"" /app/dist/src/git/git-sync.js; then
      sed -i "s|GIT_ASKPASS: \"\" }|GIT_ASKPASS: \"\", GIT_CONFIG_COUNT: \"1\", GIT_CONFIG_KEY_0: \"safe.directory\", GIT_CONFIG_VALUE_0: \"*\", HOME: \"/home/reporelay\" }|" /app/dist/src/git/git-sync.js
    fi
    mkdir -p /home/reporelay
    printf "[safe]\n\tdirectory = *\n" > /home/reporelay/.gitconfig
    chown 999:999 /home/reporelay/.gitconfig
  '
  echo "$svc patched"
done

docker compose restart worker web
echo "restarted — re-trigger syncs via REST API"
