(() => {
  "use strict";

  const SESSION_KEY = "private-dashboard-github-token";
  const config = window.PRIVATE_DASHBOARD_CONFIG || {};
  const root = document.getElementById("private-app-root");
  const createTokenLink = document.getElementById("create-token-link");
  const tokenInput = document.getElementById("github-token");
  const loginButton = document.getElementById("login-button");
  const logoutButton = document.getElementById("logout-button");
  const gateMessage = document.getElementById("gate-message");
  const accessStatus = document.getElementById("access-status");
  const blobUrls = [];

  function setMessage(message, isError = false) {
    if (!gateMessage) return;
    gateMessage.textContent = message;
    gateMessage.classList.toggle("error", isError);
  }

  function privateBundleUrl() {
    const owner = String(config.githubOwner || "").trim();
    const repo = String(config.privateRepository || "").trim();
    const ref = String(config.privateRef || "main").trim();
    const path = String(config.bundlePath || "dist/bundle.json").split("/").filter(Boolean).map(encodeURIComponent).join("/");
    if (!owner || !repo || repo.includes("REPLACE-WITH")) throw new Error("Set the private repository name in config.js before deploying.");
    return `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}?ref=${encodeURIComponent(ref)}`;
  }

  function tokenCreationUrl() {
    const owner = String(config.githubOwner || "").trim();
    const repo = String(config.privateRepository || "private dashboard repository").trim();
    const url = new URL("https://github.com/settings/personal-access-tokens/new");
    url.search = new URLSearchParams({
      name: "Private dashboard reader",
      description: `Read-only browser access to ${owner}/${repo}`,
      target_name: owner,
      expires_in: "90",
      contents: "read"
    }).toString();
    return url.toString();
  }

  function releaseBlobUrls() {
    while (blobUrls.length) URL.revokeObjectURL(blobUrls.pop());
  }

  function installStyles(css) {
    const blobUrl = URL.createObjectURL(new Blob([css], { type: "text/css" }));
    blobUrls.push(blobUrl);
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = blobUrl;
    document.head.appendChild(link);
  }

  function runClassicScript(source, name) {
    return new Promise((resolve, reject) => {
      const blobUrl = URL.createObjectURL(new Blob([`${source}\n//# sourceURL=private-dashboard/${name}`], { type: "text/javascript" }));
      blobUrls.push(blobUrl);
      const script = document.createElement("script");
      script.src = blobUrl;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Could not initialize private module ${name}.`));
      document.body.appendChild(script);
    });
  }

  function validateBundle(bundle) {
    if (bundle?.schema !== "private-dashboard-bundle/v1") throw new Error("The private repository returned an unsupported bundle.");
    if (typeof bundle.html !== "string" || typeof bundle.css !== "string" || !Array.isArray(bundle.scripts)) throw new Error("The private bundle is incomplete.");
    if (bundle.scripts.some(item => typeof item?.name !== "string" || typeof item?.source !== "string")) throw new Error("The private bundle contains an invalid script entry.");
    return bundle;
  }

  async function fetchPrivateBundle(token) {
    const response = await fetch(privateBundleUrl(), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.raw+json",
        "X-GitHub-Api-Version": "2026-03-10"
      },
      cache: "no-store"
    });
    if ([401, 403, 404].includes(response.status)) throw new Error("GitHub could not read the private bundle. Check the token, repository name, expiration, and Contents permission.");
    if (!response.ok) throw new Error(`GitHub private-content request failed (${response.status}).`);
    return validateBundle(await response.json());
  }

  async function loadPrivateApplication(token) {
    accessStatus.textContent = "Reading private repository…";
    setMessage("Downloading the private application directly from GitHub…");
    const bundle = await fetchPrivateBundle(token);
    sessionStorage.setItem(SESSION_KEY, token);
    installStyles(bundle.css);
    root.className = "";
    root.innerHTML = bundle.html;
    for (const script of bundle.scripts) await runClassicScript(script.source, script.name);
    accessStatus.textContent = "Private application loaded";
    logoutButton.hidden = false;
    document.documentElement.dataset.privateDashboardLoaded = "true";
  }

  function lockDashboard() {
    sessionStorage.removeItem(SESSION_KEY);
    releaseBlobUrls();
    location.reload();
  }

  async function submitToken() {
    const token = tokenInput.value.trim();
    if (!token) return setMessage("Enter a fine-grained GitHub token.", true);
    loginButton.disabled = true;
    tokenInput.disabled = true;
    try { await loadPrivateApplication(token); }
    catch (error) {
      sessionStorage.removeItem(SESSION_KEY);
      accessStatus.textContent = "Repository token required";
      loginButton.disabled = false;
      tokenInput.disabled = false;
      setMessage(error.message, true);
    }
  }

  async function initialize() {
    if (window.top !== window.self) {
      accessStatus.textContent = "Open this page directly";
      setMessage("For security, the private dashboard cannot be loaded inside another site.", true);
      loginButton.disabled = true;
      tokenInput.disabled = true;
      return;
    }
    createTokenLink.href = tokenCreationUrl();
    loginButton.addEventListener("click", submitToken);
    tokenInput.addEventListener("keydown", event => { if (event.key === "Enter") submitToken(); });
    logoutButton.addEventListener("click", lockDashboard);
    const savedToken = sessionStorage.getItem(SESSION_KEY);
    if (!savedToken) return;
    loginButton.disabled = true;
    tokenInput.disabled = true;
    try { await loadPrivateApplication(savedToken); }
    catch (error) {
      sessionStorage.removeItem(SESSION_KEY);
      accessStatus.textContent = "Repository token required";
      loginButton.disabled = false;
      tokenInput.disabled = false;
      setMessage(error.message, true);
    }
  }

  initialize();
})();
