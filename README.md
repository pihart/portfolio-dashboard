# Static private-dashboard shell

This repository is safe to publish with GitHub Pages. It contains only a generic unlock screen and bundle loader. The dashboard implementation, strategy, data, defaults, and descriptive text stay in a separate private repository.

There is no Worker, backend, OAuth App, or client secret. The shell is also an installable PWA. Its token gate and authenticated GitHub client come from the pinned, public `pihart/private-github-content-client` build dependency; the Pages workflow serves that dependency from this site's own origin.

## How access works

1. Click the shell's **Create restricted token on GitHub** link. GitHub opens a token form prefilled with the owner, a 90-day expiration, and `Contents: Read`.
2. Choose **Only select repositories**, select the private dashboard repository, and generate the token. GitHub does not currently provide a URL parameter that preselects a specific repository.
3. Copy and paste it into the public shell.
4. The browser requests `dist/bundle.json` directly from GitHub's Contents API using the raw-file media type.
5. The token remains in `sessionStorage`, so closing the tab removes it. It is never placed in the URL or committed to either repository.
6. The credential form supports Password AutoFill. Safari web apps can retrieve a saved credential from macOS Passwords/iCloud Keychain with user approval.

## Install on Mac

Open the Pages URL in Safari and choose **File → Add to Dock**. The web app manifest supplies the name, theme, and icon. A service worker caches only the public unlock shell; private bundles, API responses, portfolio data, and tokens are deliberately excluded.

On the first unlock, paste the token and accept Safari's offer to save the credential if shown. On later launches, focus the token field and choose the saved **Private Portfolio Dashboard** credential to use Password AutoFill or Touch ID.

GitHub documents that the Contents endpoint supports fine-grained tokens with read-only Contents permission. The private bundle is under the endpoint's 1 MB full-feature limit.

## Configure

Set `githubOwner` and `privateRepository` in `config.js`. These identifiers are public; do not put a token there.

Create this as a fresh public repository. Do not repurpose the existing combined dashboard repository, because its Git history already contains private source.
