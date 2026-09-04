(() => {
  "use strict";

  const config = window.PRIVATE_DASHBOARD_CONFIG || {};
  const client = window.PrivateGitHubContentClient.createClient({
    owner: config.githubOwner,
    repository: config.privateRepository,
    sessionKey: "private-dashboard-github-token",
  });
  const root = document.getElementById("private-app-root");
  const createTokenLink = document.getElementById("create-token-link");
  const tokenInput = document.getElementById("github-token");
  const unlockForm = document.getElementById("unlock-form");
  const loginButton = document.getElementById("login-button");
  const installButton = document.getElementById("install-button");
  const logoutButton = document.getElementById("logout-button");
  const gateMessage = document.getElementById("gate-message");
  const accessStatus = document.getElementById("access-status");
  const blobUrls = [];
  let deferredInstallPrompt = null;

  function setMessage(message, isError = false) {
    if (!gateMessage) return;
    gateMessage.textContent = message;
    gateMessage.classList.toggle("error", isError);
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

  async function fetchPrivateBundle() {
    const ref = String(config.privateRef || "main").trim();
    const path = String(config.bundlePath || "dist/bundle.json").split("/").filter(Boolean).map(encodeURIComponent).join("/");
    const response = await client.request(`/contents/${path}`, { query: { ref } });
    return validateBundle(await response.json());
  }

  async function loadPrivateApplication() {
    accessStatus.textContent = "Reading private repository…";
    setMessage("Downloading the private application directly from GitHub…");
    const bundle = await fetchPrivateBundle();
    installStyles(bundle.css);
    root.className = "";
    root.innerHTML = bundle.html;
    for (const script of bundle.scripts) await runClassicScript(script.source, script.name);
    accessStatus.textContent = "Private application loaded";
    logoutButton.hidden = false;
    document.documentElement.dataset.privateDashboardLoaded = "true";
  }

  async function offerCredentialSave(token) {
    if (!window.PasswordCredential || !navigator.credentials?.store) return;
    try {
      await navigator.credentials.store(new PasswordCredential({
        id: "Private Portfolio Dashboard",
        name: "Private Portfolio Dashboard",
        password: token
      }));
    } catch (_) {
      // Password storage is always optional and remains controlled by the browser.
    }
  }

  function lockDashboard() {
    client.lock();
    releaseBlobUrls();
    location.reload();
  }

  async function installApplication() {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      installButton.hidden = true;
      return;
    }
    setMessage("On Mac, open this page in Safari and choose File → Add to Dock.");
  }

  function configureInstallation() {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    if (isStandalone) installButton.hidden = true;
    window.addEventListener("beforeinstallprompt", event => {
      event.preventDefault();
      deferredInstallPrompt = event;
      installButton.hidden = false;
    });
    window.addEventListener("appinstalled", () => {
      deferredInstallPrompt = null;
      installButton.hidden = true;
    });
    installButton.addEventListener("click", installApplication);
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js", { scope: "./" }).catch(() => {
        setMessage("The app is available, but offline installation could not be initialized.", true);
      });
    });
  }

  async function initialize() {
    if (window.top !== window.self) {
      accessStatus.textContent = "Open this page directly";
      setMessage("For security, the private dashboard cannot be loaded inside another site.", true);
      loginButton.disabled = true;
      tokenInput.disabled = true;
      return;
    }
    const restore = window.PrivateGitHubContentClient.bindTokenGate({
      client,
      form: unlockForm,
      tokenInput,
      submitButton: loginButton,
      tokenLink: createTokenLink,
      status: accessStatus,
      tokenLinkOptions: { name: "Private dashboard reader", expiresIn: 90 },
      onUnlock: async token => {
        await loadPrivateApplication();
        await offerCredentialSave(token);
      },
      onError: error => setMessage(error.message, true),
    });
    logoutButton.addEventListener("click", lockDashboard);
    configureInstallation();
    registerServiceWorker();
    restore();
  }

  initialize();
})();
