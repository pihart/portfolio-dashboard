# Static private-dashboard shell

This repository is safe to publish with GitHub Pages. It contains only a generic unlock screen and bundle loader. The dashboard implementation, strategy, data, defaults, and descriptive text stay in a separate private repository.

There is no Worker, backend, OAuth App, or client secret.

## How access works

1. Click the shell's **Create restricted token on GitHub** link. GitHub opens a token form prefilled with the owner, a 90-day expiration, and `Contents: Read`.
2. Choose **Only select repositories**, select the private dashboard repository, and generate the token. GitHub does not currently provide a URL parameter that preselects a specific repository.
3. Copy and paste it into the public shell.
4. The browser requests `dist/bundle.json` directly from GitHub's Contents API using the raw-file media type.
5. The token remains in `sessionStorage`, so closing the tab removes it. It is never placed in the URL or committed to either repository.

GitHub documents that the Contents endpoint supports fine-grained tokens with read-only Contents permission. The private bundle is under the endpoint's 1 MB full-feature limit.

## Configure

Set `githubOwner` and `privateRepository` in `config.js`. These identifiers are public; do not put a token there.

Create this as a fresh public repository. Do not repurpose the existing combined dashboard repository, because its Git history already contains private source.
