#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
output="$root/.build/pages"
client_repo="https://github.com/pihart/private-github-content-client.git"
client_revision="f70a168"

rm -rf "$output"
mkdir -p "$output/icons"
cp "$root/index.html" "$root/config.js" "$root/loader.js" "$root/shell.css" "$root/service-worker.js" "$root/manifest.webmanifest" "$output/"
cp "$root/icons/icon-192.png" "$root/icons/icon-512.png" "$output/icons/"
git clone --quiet --depth 1 "$client_repo" "$output/shared-client"
git -C "$output/shared-client" checkout --quiet "$client_revision"
cp "$output/shared-client/github-private-content-client.js" "$output/"
rm -rf "$output/shared-client"
