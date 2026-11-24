#!/usr/bin/env bash
set -euo pipefail

site=".cloudflare-dist"
mkdir -p "$site"
cp -R corridor/. "$site/"
sed "s|const endpoint = [^;]*;|const endpoint = '/api';|" \
  corridor/guestbook-service/guestbook.js > "$site/guestbook-service/guestbook.js"
grep -Fq "const endpoint = '/api';" "$site/guestbook-service/guestbook.js"
cp cloudflare-pages/_worker.js cloudflare-pages/_routes.json "$site/"
