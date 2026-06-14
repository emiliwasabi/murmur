let playerGapiReady = false;
let playerGisReady = false;
let playerTokenClient = null;
let initError = null;

const PLAYER_SCOPES = "https://www.googleapis.com/auth/calendar.readonly";
const PLAYER_DISCOVERY =
  "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest";
const TOKEN_STORAGE_KEY = "nomad_gcal_token";

function getPlayerConfig() {
  return {
    clientId: window.GCAL_CONFIG?.CLIENT_ID || "",
    apiKey: window.GCAL_CONFIG?.API_KEY || "",
  };
}

function isIosOrBluefy() {
  return (
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    /Bluefy/i.test(navigator.userAgent)
  );
}

function getOAuthRedirectUri() {
  if (window.GCAL_CONFIG?.OAUTH_REDIRECT_URI) {
    return window.GCAL_CONFIG.OAUTH_REDIRECT_URI;
  }
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  return url.toString();
}

function usesRedirectOAuth() {
  return isIosOrBluefy();
}

function isPlayerCalendarReady() {
  return playerGapiReady && playerGisReady && Boolean(playerTokenClient);
}

function getInitDiagnostics() {
  const { clientId, apiKey } = getPlayerConfig();
  return {
    hasConfig: Boolean(window.GCAL_CONFIG),
    hasClientId: Boolean(clientId),
    hasApiKey: Boolean(apiKey),
    gisLoaded: Boolean(window.google?.accounts?.oauth2),
    gapiLoaded: Boolean(window.gapi),
    gapiReady: playerGapiReady,
    gisReady: playerGisReady,
    tokenClient: Boolean(playerTokenClient),
    initError,
    redirectUri: getOAuthRedirectUri(),
  };
}

function getInitErrorMessage() {
  const d = getInitDiagnostics();
  if (!d.hasConfig || !d.hasClientId || !d.hasApiKey) {
    return "Config manquante — config.local.js introuvable ou incomplet.";
  }
  if (initError) return initError;
  if (!d.gisLoaded) {
    return "Script Google (accounts.google.com) bloque ou lent dans Bluefy. Rechargez la page.";
  }
  if (!d.gapiLoaded) {
    return "Script Google API (apis.google.com) bloque ou lent dans Bluefy. Rechargez la page.";
  }
  if (!d.gisReady) {
    return "OAuth Google pas pret. Verifiez l'origine et l'URI de redirection dans Google Cloud Console.";
  }
  if (!d.gapiReady) {
    return "Google Calendar API pas chargee. Verifiez la cle API et ses restrictions (referrer).";
  }
  return "Google Calendar: initialisation incomplete.";
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing?.dataset.loaded === "true") {
      resolve();
      return;
    }
    const script = existing || document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () =>
      reject(new Error(`Impossible de charger ${src}`));
    if (!existing) document.head.appendChild(script);
  });
}

function storeAccessToken(tokenResponse) {
  if (!tokenResponse?.access_token) return;
  sessionStorage.setItem(
    TOKEN_STORAGE_KEY,
    JSON.stringify({
      access_token: tokenResponse.access_token,
      expires_in: Number(tokenResponse.expires_in || 3600),
      obtained_at: Date.now(),
    }),
  );
}

function restoreStoredToken() {
  const raw = sessionStorage.getItem(TOKEN_STORAGE_KEY);
  if (!raw || !window.gapi?.client) return false;

  try {
    const stored = JSON.parse(raw);
    const expiresAt =
      stored.obtained_at + Number(stored.expires_in || 0) * 1000 - 60_000;
    if (!stored.access_token || Date.now() >= expiresAt) {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      return false;
    }
    window.gapi.client.setToken({ access_token: stored.access_token });
    return true;
  } catch {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    return false;
  }
}

function handleTokenResponse(response) {
  if (response.error) {
    window.dispatchEvent(
      new CustomEvent("player-calendar-auth-error", { detail: response }),
    );
    return;
  }

  storeAccessToken(response);
  if (window.gapi?.client) {
    window.gapi.client.setToken({ access_token: response.access_token });
  }
  window.dispatchEvent(new CustomEvent("player-calendar-authenticated"));
}

function handleOAuthError(error) {
  window.dispatchEvent(
    new CustomEvent("player-calendar-auth-error", {
      detail: {
        error: error?.type || "oauth_error",
        message: error?.message || "Connexion Google impossible.",
      },
    }),
  );
}

async function initGapiClient() {
  const { clientId, apiKey } = getPlayerConfig();
  if (!clientId || !apiKey) return false;

  await new Promise((resolve, reject) => {
    window.gapi.load("client", {
      callback: resolve,
      onerror: reject,
    });
  });

  await window.gapi.client.init({
    apiKey,
    discoveryDocs: [PLAYER_DISCOVERY],
  });

  playerGapiReady = true;
  if (restoreStoredToken()) {
    window.dispatchEvent(new CustomEvent("player-calendar-authenticated"));
  }
  return true;
}

function initGisClient() {
  const { clientId } = getPlayerConfig();
  if (!clientId) return false;
  if (!window.google?.accounts?.oauth2) {
    throw new Error("google.accounts.oauth2 indisponible");
  }

  const redirect = usesRedirectOAuth();
  const config = {
    client_id: clientId,
    scope: PLAYER_SCOPES,
    callback: handleTokenResponse,
    error_callback: handleOAuthError,
  };

  if (redirect) {
    config.ux_mode = "redirect";
    config.redirect_uri = getOAuthRedirectUri();
  }

  playerTokenClient = window.google.accounts.oauth2.initTokenClient(config);
  playerGisReady = true;
  return true;
}

async function bootstrapCalendarAuth() {
  const { clientId, apiKey } = getPlayerConfig();
  if (!clientId || !apiKey) {
    initError = "CLIENT_ID ou API_KEY manquant dans config.local.js";
    window.dispatchEvent(new CustomEvent("player-calendar-ready"));
    return;
  }

  try {
    await Promise.all([
      loadScript("https://accounts.google.com/gsi/client"),
      loadScript("https://apis.google.com/js/api.js"),
    ]);

    initGisClient();
    await initGapiClient();

    window.dispatchEvent(new CustomEvent("player-calendar-ready"));
  } catch (error) {
    initError = error.message || "Erreur d'initialisation Google";
    console.error("[CalendarAuth]", error, getInitDiagnostics());
    window.dispatchEvent(new CustomEvent("player-calendar-ready"));
  }
}

function formatAuthError(detail) {
  const code = detail?.error || detail?.type || "";
  if (code === "popup_failed_to_open" || code === "popup_closed") {
    return "Fenetre Google bloquee. Sur iPhone, utilisez le mode redirect (Bluefy).";
  }
  if (code === "access_denied") {
    return "Acces Google Calendar refuse.";
  }
  if (/disallowed|secure|browser|useragent/i.test(`${code} ${detail?.message || ""}`)) {
    return "Google bloque la connexion dans Bluefy. Verifiez l'URI de redirection dans Google Cloud Console.";
  }
  return detail?.message || detail?.error_description || code || "Authentification refusee.";
}

function requestPlayerCalendarAccess() {
  return new Promise((resolve, reject) => {
    if (!isPlayerCalendarReady()) {
      reject(new Error(getInitErrorMessage()));
      return;
    }

    if (restoreStoredToken()) {
      resolve();
      return;
    }

    const onAuth = () => {
      cleanup();
      resolve();
    };
    const onError = (event) => {
      cleanup();
      reject(new Error(formatAuthError(event.detail)));
    };
    const cleanup = () => {
      window.removeEventListener("player-calendar-authenticated", onAuth);
      window.removeEventListener("player-calendar-auth-error", onError);
    };

    window.addEventListener("player-calendar-authenticated", onAuth);
    window.addEventListener("player-calendar-auth-error", onError);

    if (usesRedirectOAuth()) {
      sessionStorage.setItem("nomad_calendar_auth_pending", "1");
      playerTokenClient.requestAccessToken({ prompt: "consent" });
      return;
    }

    playerTokenClient.requestAccessToken({ prompt: "" });
  });
}

window.playerGapiInit = () => bootstrapCalendarAuth();
window.playerCalendarAuthInit = () => {};

window.PlayerCalendarAuth = {
  isReady: isPlayerCalendarReady,
  requestAccess: requestPlayerCalendarAccess,
  isAuthenticated: () => restoreStoredToken(),
  usesRedirectOAuth,
  getOAuthRedirectUri,
  getInitErrorMessage,
  bootstrap: bootstrapCalendarAuth,
};

document.addEventListener("DOMContentLoaded", () => {
  window.setTimeout(bootstrapCalendarAuth, 100);
});
