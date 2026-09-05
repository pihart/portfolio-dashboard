#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
output="$root/.build/pages"

rm -rf "$output"
mkdir -p "$output/icons"
cp "$root/index.html" "$root/config.js" "$root/github-private-content-client.js" "$root/loader.js" "$root/shell.css" "$root/service-worker.js" "$root/manifest.webmanifest" "$output/"
cp "$root/icons/icon-192.png" "$root/icons/icon-512.png" "$output/icons/"
