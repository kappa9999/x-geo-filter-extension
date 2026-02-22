const STORAGE_KEYS = {
  settings: "xgf_settings",
  cache: "xgf_user_location_cache",
  stats: "xgf_stats",
  actionHistory: "xgf_action_history",
  actioned: "xgf_actioned_handles",
  recentMatches: "xgf_recent_matches"
};

const DEFAULT_SETTINGS = {
  enabled: true,
  pauseUntil: 0,
  locationRules: ["india"],
  excludeLocationRules: [],
  whitelistHandles: [],
  hideMode: "dim", // hide | dim | none
  actionMode: "none", // none | mute | block
  dryRun: true,
  maxAutoActionsPerHour: 5,
  actionDelayMs: 2500,
  minSightingsBeforeAction: 2,
  showReasonBadge: true,
  strictWordMatch: false
};

const DEFAULT_STATS = {
  scannedTweets: 0,
  matchedTweets: 0,
  hiddenCount: 0,
  dimmedCount: 0,
  mutedCount: 0,
  blockedCount: 0,
  cacheHits: 0,
  recentMatchesCount: 0,
  lastUpdated: 0
};

const MAX_RECENT_MATCHES = 120;
const MAX_TRACKED_TWEETS = 12000;
const ABOUT_LOOKUP_SUCCESS_TTL_MS = 24 * 60 * 60 * 1000;
const ABOUT_LOOKUP_RETRY_TTL_MS = 30 * 1000;
const ABOUT_LOOKUP_MAX_CONCURRENCY = 8;

const ABOUT_ACCOUNT_QUERY = {
  id: "zs_jFPFT78rBpXv9Z3U2YQ",
  operationName: "AboutAccountQuery"
};

const X_WEB_BEARER_TOKEN =
  "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";

let settings = { ...DEFAULT_SETTINGS };
let locationCache = {};
let stats = { ...DEFAULT_STATS };
let actionHistory = [];
let actionedHandles = {};
let recentMatches = [];

let cacheVersion = 1;
let observer = null;
let processQueued = false;
let queueRunning = false;
const actionQueue = [];

let saveCacheTimer = null;
let saveStatsTimer = null;
let saveRecentTimer = null;

const scannedTweetKeys = new Set();
const matchedTweetKeys = new Set();
const hiddenTweetKeys = new Set();
const dimmedTweetKeys = new Set();
const cacheHitTweetKeys = new Set();

const sightingsByHandle = {};
let whitelistSet = new Set();

const aboutLookupQueue = [];
const aboutQueuedHandles = new Set();
const aboutInFlightHandles = new Set();
let aboutLookupActive = 0;

function now() {
  return Date.now();
}

function normalizeHandle(handle) {
  if (!handle || typeof handle !== "string") return "";
  return handle.replace(/^@/, "").trim().toLowerCase();
}

function normalizeLocation(value) {
  if (!value || typeof value !== "string") return "";
  return value.trim();
}

const COUNTRY_HINTS = [
  ["IN", ["india", "bharat"]],
  ["PK", ["pakistan"]],
  ["BD", ["bangladesh"]],
  ["NP", ["nepal"]],
  ["LK", ["sri lanka"]],
  ["AF", ["afghanistan"]],
  ["IR", ["iran"]],
  ["IQ", ["iraq"]],
  ["SA", ["saudi arabia", "ksa"]],
  ["AE", ["uae", "united arab emirates", "dubai", "abu dhabi"]],
  ["QA", ["qatar"]],
  ["KW", ["kuwait"]],
  ["OM", ["oman"]],
  ["BH", ["bahrain"]],
  ["TR", ["turkey", "türkiye", "turkiye"]],
  ["RU", ["russia", "russian federation"]],
  ["UA", ["ukraine"]],
  ["BY", ["belarus"]],
  ["GE", ["tbilisi", "sakartvelo"]],
  ["KZ", ["kazakhstan"]],
  ["UZ", ["uzbekistan"]],
  ["CN", ["china", "prc"]],
  ["HK", ["hong kong"]],
  ["TW", ["taiwan"]],
  ["JP", ["japan"]],
  ["KR", ["south korea", "korea"]],
  ["KP", ["north korea"]],
  ["VN", ["vietnam"]],
  ["TH", ["thailand"]],
  ["MY", ["malaysia"]],
  ["SG", ["singapore"]],
  ["ID", ["indonesia"]],
  ["PH", ["philippines"]],
  ["AU", ["australia"]],
  ["NZ", ["new zealand"]],
  ["GB", ["united kingdom", "uk", "england", "scotland", "wales", "great britain", "britain"]],
  ["IE", ["ireland"]],
  ["DE", ["germany", "deutschland"]],
  ["FR", ["france"]],
  ["ES", ["spain", "españa", "espana"]],
  ["IT", ["italy", "italia"]],
  ["NL", ["netherlands", "holland"]],
  ["BE", ["belgium"]],
  ["CH", ["switzerland"]],
  ["AT", ["austria"]],
  ["SE", ["sweden"]],
  ["NO", ["norway"]],
  ["DK", ["denmark"]],
  ["FI", ["finland"]],
  ["PL", ["poland"]],
  ["PT", ["portugal"]],
  ["RO", ["romania"]],
  ["CZ", ["czech republic", "czechia"]],
  ["HU", ["hungary"]],
  ["GR", ["greece"]],
  ["EG", ["egypt"]],
  ["MA", ["morocco"]],
  ["DZ", ["algeria"]],
  ["TN", ["tunisia"]],
  ["NG", ["nigeria"]],
  ["KE", ["kenya"]],
  ["ZA", ["south africa"]],
  ["GH", ["ghana"]],
  ["ET", ["ethiopia"]],
  ["TZ", ["tanzania"]],
  ["UG", ["uganda"]],
  ["US", ["united states", "usa", "u.s.a", "us", "u.s.", "america"]],
  ["CA", ["canada"]],
  ["MX", ["mexico"]],
  ["BR", ["brazil", "brasil"]],
  ["AR", ["argentina"]],
  ["CL", ["chile"]],
  ["CO", ["colombia"]],
  ["PE", ["peru"]],
  ["VE", ["venezuela"]]
];

const US_STATE_NAME_HINTS = [
  "alabama",
  "alaska",
  "arizona",
  "arkansas",
  "california",
  "colorado",
  "connecticut",
  "delaware",
  "florida",
  "hawaii",
  "idaho",
  "illinois",
  "indiana",
  "iowa",
  "kansas",
  "kentucky",
  "louisiana",
  "maine",
  "maryland",
  "massachusetts",
  "michigan",
  "minnesota",
  "mississippi",
  "missouri",
  "montana",
  "nebraska",
  "nevada",
  "new hampshire",
  "new jersey",
  "new mexico",
  "new york",
  "north carolina",
  "north dakota",
  "ohio",
  "oklahoma",
  "oregon",
  "pennsylvania",
  "rhode island",
  "south carolina",
  "south dakota",
  "tennessee",
  "texas",
  "utah",
  "vermont",
  "virginia",
  "washington",
  "west virginia",
  "wisconsin",
  "wyoming",
  "district of columbia"
];

const US_CITY_HINTS = [
  "washington dc",
  "washington, dc",
  "new york",
  "los angeles",
  "chicago",
  "houston",
  "phoenix",
  "philadelphia",
  "san antonio",
  "san diego",
  "dallas",
  "san jose",
  "austin",
  "jacksonville",
  "fort worth",
  "columbus",
  "charlotte",
  "san francisco",
  "indianapolis",
  "seattle",
  "denver",
  "boston",
  "el paso",
  "nashville",
  "detroit",
  "oklahoma city",
  "las vegas",
  "portland",
  "memphis",
  "louisville",
  "baltimore",
  "milwaukee",
  "albuquerque",
  "tucson",
  "fresno",
  "sacramento",
  "mesa",
  "atlanta",
  "kansas city",
  "miami",
  "oakland",
  "palo alto"
];

const US_STATE_ABBR_RE = /(?:^|[,\s/-])(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|IA|IL|KS|KY|LA|MA|MD|MI|MN|MO|MS|MT|NC|ND|NE|NH|NJ|NM|NV|NY|OH|PA|RI|SC|SD|TN|TX|UT|VA|VT|WA|WI|WV|WY|DC)(?:$|[,\s/-])/i;

const CANADA_HINTS = [
  "canada",
  "ontario",
  "quebec",
  "québec",
  "british columbia",
  "alberta",
  "manitoba",
  "saskatchewan",
  "nova scotia",
  "new brunswick",
  "newfoundland",
  "prince edward island",
  "toronto",
  "montreal",
  "vancouver",
  "calgary",
  "ottawa",
  "edmonton"
];

const CANADA_PROVINCE_ABBR_RE = /(?:^|[,\s/-])(AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|PQ|SK|YT)(?:$|[,\s/-])/i;

function locationContainsGeoKeyword(locationLower, keyword) {
  if (!keyword) return false;

  if (keyword.includes(" ") || keyword.includes(".") || keyword.includes("-")) {
    return locationLower.includes(keyword);
  }

  const pattern = new RegExp(`(^|[^a-z0-9])${escRegex(keyword)}([^a-z0-9]|$)`, "i");
  return pattern.test(locationLower);
}

function extractCountryCodeFromFlagEmoji(textRaw) {
  const chars = Array.from(String(textRaw || ""));
  if (!chars.length) return "";

  const regionalBase = 0x1f1e6;
  const regionalMax = 0x1f1ff;
  const alphaBase = "A".charCodeAt(0);

  for (let i = 0; i < chars.length - 1; i++) {
    const a = chars[i].codePointAt(0);
    const b = chars[i + 1].codePointAt(0);

    if (a >= regionalBase && a <= regionalMax && b >= regionalBase && b <= regionalMax) {
      return String.fromCharCode(
        alphaBase + (a - regionalBase),
        alphaBase + (b - regionalBase)
      );
    }
  }

  return "";
}

function isLikelyUSLocation(locationLower, locationRaw) {
  if (!locationLower) return false;

  if (locationLower === "dc" || locationLower === "washington dc") {
    return true;
  }

  if (US_STATE_NAME_HINTS.some((name) => locationContainsGeoKeyword(locationLower, name))) {
    return true;
  }

  if (US_CITY_HINTS.some((name) => locationContainsGeoKeyword(locationLower, name))) {
    return true;
  }

  return US_STATE_ABBR_RE.test(String(locationRaw || "").toUpperCase());
}

function isLikelyCanadaLocation(locationLower, locationRaw) {
  if (!locationLower) return false;

  if (CANADA_HINTS.some((name) => locationContainsGeoKeyword(locationLower, name))) {
    return true;
  }

  return CANADA_PROVINCE_ABBR_RE.test(String(locationRaw || "").toUpperCase());
}

function inferCountryCodeFromLocation(locationRaw) {
  const location = normalizeLocation(locationRaw);
  const locationLower = location.toLowerCase();
  if (!locationLower) return "";

  const ccFromEmoji = extractCountryCodeFromFlagEmoji(location);
  if (ccFromEmoji) return ccFromEmoji;

  for (const [countryCode, keywords] of COUNTRY_HINTS) {
    if (keywords.some((keyword) => locationContainsGeoKeyword(locationLower, keyword))) {
      return countryCode;
    }
  }

  if (isLikelyUSLocation(locationLower, location)) return "US";
  if (isLikelyCanadaLocation(locationLower, location)) return "CA";

  return "";
}

function countryCodeToFlagEmoji(countryCode) {
  if (!/^[A-Z]{2}$/.test(countryCode)) return "";
  const A = 0x1f1e6;
  const alphaBase = "A".charCodeAt(0);
  const first = A + (countryCode.charCodeAt(0) - alphaBase);
  const second = A + (countryCode.charCodeAt(1) - alphaBase);
  return String.fromCodePoint(first, second);
}

function getLocationFlagEmoji(locationRaw) {
  const cc = inferCountryCodeFromLocation(locationRaw);
  if (!cc) return "";
  return countryCodeToFlagEmoji(cc);
}

function uniqueStrings(values) {
  const out = [];
  const seen = new Set();
  for (const raw of values || []) {
    const v = String(raw || "").trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

function normalizeSettings(raw = {}) {
  const merged = { ...DEFAULT_SETTINGS, ...(raw || {}) };

  if (!raw.actionMode) {
    if (raw.autoBlock) merged.actionMode = "block";
    else if (raw.autoMute) merged.actionMode = "mute";
  }

  if (!raw.hideMode) {
    if (raw.hidePosts === false) merged.hideMode = "none";
    else merged.hideMode = "hide";
  }

  if (!["none", "mute", "block"].includes(merged.actionMode)) {
    merged.actionMode = "none";
  }

  if (!["hide", "dim", "none"].includes(merged.hideMode)) {
    merged.hideMode = "hide";
  }

  merged.locationRules = uniqueStrings(merged.locationRules || []);
  merged.excludeLocationRules = uniqueStrings(merged.excludeLocationRules || []);
  merged.whitelistHandles = uniqueStrings((merged.whitelistHandles || []).map(normalizeHandle));

  merged.pauseUntil = Math.max(0, Number(merged.pauseUntil || 0));
  merged.maxAutoActionsPerHour = Math.max(0, Math.min(100, Number(merged.maxAutoActionsPerHour || 0)));
  merged.actionDelayMs = Math.max(500, Math.min(30000, Number(merged.actionDelayMs || 2500)));
  merged.minSightingsBeforeAction = Math.max(1, Math.min(20, Number(merged.minSightingsBeforeAction || 1)));

  merged.enabled = Boolean(merged.enabled);
  merged.dryRun = Boolean(merged.dryRun);
  merged.showReasonBadge = Boolean(merged.showReasonBadge);
  merged.strictWordMatch = Boolean(merged.strictWordMatch);

  return merged;
}

function isPaused() {
  return Number(settings.pauseUntil || 0) > now();
}

function isEnabled() {
  return Boolean(settings.enabled) && !isPaused();
}

function getIncludeRules() {
  return (settings.locationRules || []).map((x) => x.toLowerCase());
}

function getExcludeRules() {
  return (settings.excludeLocationRules || []).map((x) => x.toLowerCase());
}

function safeSetAdd(set, key) {
  set.add(key);
  if (set.size > MAX_TRACKED_TWEETS) {
    set.clear();
  }
}

function escRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function locationContainsRule(locationLower, ruleLower) {
  if (!ruleLower) return false;

  if (!settings.strictWordMatch) {
    return locationLower.includes(ruleLower);
  }

  if (ruleLower.includes(" ")) {
    return locationLower.includes(ruleLower);
  }

  const pattern = new RegExp(`(^|[^a-z0-9])${escRegex(ruleLower)}([^a-z0-9]|$)`, "i");
  return pattern.test(locationLower);
}

function evaluateLocation(locationRaw) {
  const location = normalizeLocation(locationRaw);
  const locationLower = location.toLowerCase();
  const includeRules = getIncludeRules();
  const excludeRules = getExcludeRules();

  if (!location) {
    return { matched: false, reason: "empty-location" };
  }

  if (!includeRules.length) {
    return { matched: false, reason: "no-rules" };
  }

  const matchedRule = includeRules.find((rule) => locationContainsRule(locationLower, rule));
  if (!matchedRule) {
    return { matched: false, reason: "no-include-match" };
  }

  const excludedBy = excludeRules.find((rule) => locationContainsRule(locationLower, rule));
  if (excludedBy) {
    return {
      matched: false,
      reason: "excluded",
      matchedRule,
      excludedBy
    };
  }

  return {
    matched: true,
    location,
    matchedRule
  };
}

function getTweetKey(article) {
  const statusLink = article.querySelector('a[href*="/status/"]');
  if (statusLink) {
    const href = statusLink.getAttribute("href") || statusLink.href || "";
    if (href) return href;
  }

  return `tweet:${(article.innerText || "").slice(0, 100)}`;
}

function getHandleFromArticle(article) {
  const statusLink = article.querySelector('a[href*="/status/"]');
  if (statusLink) {
    const href = statusLink.getAttribute("href") || statusLink.href || "";
    const match =
      href.match(/^\/([^/]+)\/status\//) ||
      href.match(/(?:x|twitter)\.com\/([^/]+)\/status\//);
    if (match?.[1]) return normalizeHandle(match[1]);
  }

  const allLinks = [...article.querySelectorAll('a[href^="/"]')];
  for (const link of allLinks) {
    const href = link.getAttribute("href") || "";
    if (!href || href.includes("/status/") || href.includes("/i/")) continue;
    const m = href.match(/^\/([^/?#]+)$/);
    if (m?.[1]) return normalizeHandle(m[1]);
  }

  return "";
}

const RESERVED_PROFILE_PATHS = new Set([
  "home",
  "explore",
  "notifications",
  "messages",
  "search",
  "compose",
  "settings",
  "i",
  "login",
  "signup"
]);

function getAboutHandleFromPath() {
  const path = window.location.pathname || "";
  const match = path.match(/^\/([^/?#]+)\/about\/?$/);
  if (!match?.[1]) return "";

  const handle = normalizeHandle(match[1]);
  if (!handle || RESERVED_PROFILE_PATHS.has(handle)) return "";
  return handle;
}

function normalizeWhitespace(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCookieMap() {
  const map = {};
  const raw = String(document.cookie || "");
  if (!raw) return map;

  for (const pair of raw.split(";")) {
    const idx = pair.indexOf("=");
    if (idx < 0) continue;

    const key = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    if (!key) continue;

    map[key] = value;
  }

  return map;
}

function buildXApiHeaders() {
  const cookies = parseCookieMap();
  const headers = {
    Authorization: `Bearer ${X_WEB_BEARER_TOKEN}`,
    "x-twitter-active-user": "yes",
    "x-twitter-client-language": (navigator.language || "en").split("-")[0] || "en"
  };

  if (cookies.auth_token) {
    headers["x-twitter-auth-type"] = "OAuth2Session";
  }

  if (cookies.ct0) {
    headers["x-csrf-token"] = cookies.ct0;
  }

  return headers;
}

function parseAboutSignalsFromGraphQL(jsonData) {
  const result = jsonData?.data?.user_result_by_screen_name?.result;
  if (!result || result.__typename !== "User") return null;

  const about = result.about_profile || {};
  const basedIn = normalizeLocation(about.account_based_in || about.created_country || "");
  const connectedVia = normalizeLocation(about.source || "");

  if (!basedIn && !connectedVia) return null;

  return {
    basedIn,
    connectedVia
  };
}

function sanitizeAboutValue(rawValue, labelLower = "") {
  let value = normalizeWhitespace(rawValue)
    .replace(/^[\s:–—-]+/, "")
    .replace(/[\s:–—-]+$/, "");

  if (!value) return "";

  if (labelLower) {
    const lower = value.toLowerCase();
    if (lower.startsWith(labelLower)) {
      value = normalizeWhitespace(value.slice(labelLower.length).replace(/^[\s:–—-]+/, ""));
    }
  }

  if (!value) return "";

  const lower = value.toLowerCase();
  if (lower === "account based in" || lower === "connected via" || lower === "about this account") {
    return "";
  }

  if (value.length > 100) return "";

  return value;
}

function extractLabeledValueFromRoot(root, label) {
  if (!root) return "";

  const labelLower = label.toLowerCase();
  const elements = root.querySelectorAll("span,div,p,a,li,h2,h3,strong");

  for (const element of elements) {
    const text = normalizeWhitespace(element.textContent || "");
    if (!text) continue;

    const textLower = text.toLowerCase();
    if (!textLower.includes(labelLower)) continue;

    const inline = sanitizeAboutValue(
      text.slice(textLower.indexOf(labelLower) + labelLower.length),
      labelLower
    );
    if (inline) return inline;

    const candidates = [];

    if (element.nextElementSibling) {
      candidates.push(element.nextElementSibling.textContent || "");
    }

    const parent = element.parentElement;
    if (parent) {
      const siblings = [...parent.children];
      const idx = siblings.indexOf(element);
      if (idx >= 0) {
        for (let i = idx + 1; i < Math.min(siblings.length, idx + 4); i++) {
          candidates.push(siblings[i].textContent || "");
        }
      }

      if (parent.nextElementSibling) {
        candidates.push(parent.nextElementSibling.textContent || "");
      }
    }

    for (const candidate of candidates) {
      const cleaned = sanitizeAboutValue(candidate, labelLower);
      if (cleaned) return cleaned;
    }
  }

  return "";
}

function extractLabeledValueFromHtml(html, label) {
  const labelEscaped = escRegex(label);
  const patterns = [
    new RegExp(`${labelEscaped}(?:\\s|<[^>]*>|&nbsp;|&#160;){0,18}([^<>{}\\n\\r]{2,100})<`, "i"),
    new RegExp(`${labelEscaped}\\s*[:\\-–—]?\\s*([^<\\n\\r]{2,100})`, "i")
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match?.[1]) continue;

    const value = sanitizeAboutValue(match[1], label.toLowerCase());
    if (value) return value;
  }

  return "";
}

function parseAboutSignalsFromHtml(html) {
  const doc = new DOMParser().parseFromString(String(html || ""), "text/html");

  const basedIn =
    extractLabeledValueFromRoot(doc, "Account based in") ||
    extractLabeledValueFromHtml(html, "Account based in");

  const connectedVia =
    extractLabeledValueFromRoot(doc, "Connected via") ||
    extractLabeledValueFromHtml(html, "Connected via");

  return {
    basedIn: normalizeLocation(basedIn),
    connectedVia: normalizeLocation(connectedVia)
  };
}

function buildAboutCacheEntry(signals = {}, previous = null) {
  const incomingBasedIn = normalizeLocation(signals.basedIn || "");
  const incomingConnectedVia = normalizeLocation(signals.connectedVia || "");

  const basedIn = incomingBasedIn || normalizeLocation(previous?.basedIn || "");
  const connectedVia = incomingConnectedVia || normalizeLocation(previous?.connectedVia || "");
  const hasFreshSignals = Boolean(incomingBasedIn || incomingConnectedVia);

  return {
    location: basedIn || connectedVia || "",
    basedIn,
    connectedVia,
    source: "about",
    updatedAt: now(),
    fetchFailedAt: hasFreshSignals ? 0 : now(),
    fetchStatus: hasFreshSignals ? "ok" : (previous?.location ? "stale" : "empty")
  };
}

function commitAboutCacheEntry(handle, signals = {}) {
  const normalizedHandle = normalizeHandle(handle);
  if (!normalizedHandle) return;

  const previous = locationCache[normalizedHandle] || null;
  const entry = buildAboutCacheEntry(signals, previous);

  const changed =
    !previous ||
    previous.source !== "about" ||
    normalizeLocation(previous.location) !== entry.location ||
    normalizeLocation(previous.basedIn) !== entry.basedIn ||
    normalizeLocation(previous.connectedVia) !== entry.connectedVia ||
    previous.fetchStatus !== entry.fetchStatus;

  if (!changed) {
    locationCache[normalizedHandle] = {
      ...previous,
      updatedAt: entry.updatedAt,
      fetchFailedAt: entry.fetchFailedAt,
      fetchStatus: entry.fetchStatus
    };
    scheduleSaveCache();
    return;
  }

  locationCache[normalizedHandle] = entry;
  cacheVersion += 1;
  scheduleSaveCache();
  queueProcessAllTweets();
}

function shouldLookupAboutForHandle(handle) {
  const normalizedHandle = normalizeHandle(handle);
  if (!normalizedHandle) return false;

  const entry = locationCache[normalizedHandle];
  if (!entry || entry.source !== "about") return true;

  const ageMs = now() - Number(entry.updatedAt || 0);
  if (entry.fetchStatus === "stale") {
    return ageMs > ABOUT_LOOKUP_RETRY_TTL_MS;
  }

  if (entry.location) {
    return ageMs > ABOUT_LOOKUP_SUCCESS_TTL_MS;
  }

  return ageMs > ABOUT_LOOKUP_RETRY_TTL_MS;
}

async function fetchAboutSignalsForHandle(handle) {
  const normalizedHandle = normalizeHandle(handle);
  if (!normalizedHandle) return null;

  try {
    const gqlUrl = new URL(
      `/i/api/graphql/${ABOUT_ACCOUNT_QUERY.id}/${ABOUT_ACCOUNT_QUERY.operationName}`,
      window.location.origin
    );

    gqlUrl.searchParams.set("variables", JSON.stringify({ screenName: normalizedHandle }));
    gqlUrl.searchParams.set("features", JSON.stringify({}));
    gqlUrl.searchParams.set("fieldToggles", JSON.stringify({}));

    const gqlResponse = await fetch(gqlUrl.toString(), {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: buildXApiHeaders()
    });

    if (gqlResponse.ok) {
      const jsonData = await gqlResponse.json().catch(() => null);
      const parsed = parseAboutSignalsFromGraphQL(jsonData);
      if (parsed) return parsed;
    }
  } catch (_) {
    // fall through to HTML fallback
  }

  const aboutUrl = new URL(`/${normalizedHandle}/about`, window.location.origin).toString();
  const response = await fetch(aboutUrl, {
    credentials: "include",
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  const html = await response.text();
  return parseAboutSignalsFromHtml(html);
}

function queueAboutLookup(handle) {
  const normalizedHandle = normalizeHandle(handle);
  if (!normalizedHandle) return;

  if (!shouldLookupAboutForHandle(normalizedHandle)) return;
  if (aboutQueuedHandles.has(normalizedHandle) || aboutInFlightHandles.has(normalizedHandle)) return;

  aboutQueuedHandles.add(normalizedHandle);
  aboutLookupQueue.push(normalizedHandle);
  runAboutLookupQueue();
}

function runAboutLookupQueue() {
  while (aboutLookupActive < ABOUT_LOOKUP_MAX_CONCURRENCY && aboutLookupQueue.length) {
    const handle = aboutLookupQueue.shift();
    if (!handle) continue;

    aboutQueuedHandles.delete(handle);
    if (aboutInFlightHandles.has(handle)) continue;

    aboutInFlightHandles.add(handle);
    aboutLookupActive += 1;

    (async () => {
      try {
        const signals = await fetchAboutSignalsForHandle(handle);
        commitAboutCacheEntry(handle, signals || {});
      } catch (_) {
        commitAboutCacheEntry(handle, {});
      } finally {
        aboutInFlightHandles.delete(handle);
        aboutLookupActive = Math.max(0, aboutLookupActive - 1);

        if (aboutLookupQueue.length) {
          runAboutLookupQueue();
        }
      }
    })();
  }
}

function captureAboutLocationFromDom() {
  const handle = getAboutHandleFromPath();
  if (!handle) return;

  const basedIn = extractLabeledValueFromRoot(document, "Account based in");
  const connectedVia = extractLabeledValueFromRoot(document, "Connected via");

  if (!basedIn && !connectedVia) return;

  commitAboutCacheEntry(handle, {
    basedIn,
    connectedVia
  });
}

function getFlagNode(article) {
  return article.querySelector(":scope .xgf-flag");
}

function clearFlag(article) {
  const existing = getFlagNode(article);
  if (existing) existing.remove();
}

function findUserNameRoot(article) {
  return article.querySelector('div[data-testid="User-Name"]');
}

function findHandleHostNode(userNameRoot) {
  if (!userNameRoot) return null;

  const handleSpan = [...userNameRoot.querySelectorAll("span")].find((span) => {
    const text = (span.textContent || "").trim();
    return text.startsWith("@");
  });

  return handleSpan?.parentElement || userNameRoot;
}

function applyFlagBadge(article, handle, locationRaw) {
  const userNameRoot = findUserNameRoot(article);
  if (!userNameRoot) {
    clearFlag(article);
    return;
  }

  const location = normalizeLocation(locationRaw);
  const inferredCc = inferCountryCodeFromLocation(location);
  const flagEmoji = countryCodeToFlagEmoji(inferredCc) || "🏳️";

  const host = findHandleHostNode(userNameRoot);
  if (!host) {
    clearFlag(article);
    return;
  }

  let flagNode = getFlagNode(article);
  if (!flagNode) {
    flagNode = document.createElement("span");
    flagNode.className = "xgf-flag";
    flagNode.dataset.xgfFlag = "1";
  }

  flagNode.textContent = flagEmoji;
  flagNode.dataset.xgfCc = inferredCc || "";
  flagNode.title = location
    ? `@${handle} · ${location}${inferredCc ? ` · ${inferredCc}` : ""}`
    : `@${handle} · location unknown`;
  flagNode.setAttribute(
    "aria-label",
    location
      ? `Location flag for @${handle}: ${location}${inferredCc ? ` (${inferredCc})` : ""}`
      : `Location flag for @${handle}: unknown`
  );

  if (flagNode.parentElement !== host) {
    host.appendChild(flagNode);
  }
}

function getReasonNode(article) {
  return article.querySelector(":scope .xgf-note");
}

function setReasonNode(article, text) {
  if (!settings.showReasonBadge || settings.hideMode === "hide") {
    const old = getReasonNode(article);
    if (old) old.remove();
    return;
  }

  let node = getReasonNode(article);
  if (!node) {
    node = document.createElement("div");
    node.className = "xgf-note";
    article.appendChild(node);
  }
  node.innerHTML = text;
}

function clearVisual(article) {
  article.classList.remove("xgf-hidden", "xgf-dimmed");
  delete article.dataset.xgfReason;
  const node = getReasonNode(article);
  if (node) node.remove();
}

function scheduleSaveCache() {
  if (saveCacheTimer) clearTimeout(saveCacheTimer);
  saveCacheTimer = setTimeout(() => {
    chrome.storage.local.set({ [STORAGE_KEYS.cache]: locationCache });
  }, 650);
}

function scheduleSaveStats() {
  if (saveStatsTimer) clearTimeout(saveStatsTimer);
  saveStatsTimer = setTimeout(() => {
    stats.lastUpdated = now();
    chrome.storage.local.set({ [STORAGE_KEYS.stats]: stats });
  }, 350);
}

function scheduleSaveRecent() {
  if (saveRecentTimer) clearTimeout(saveRecentTimer);
  saveRecentTimer = setTimeout(() => {
    chrome.storage.local.set({ [STORAGE_KEYS.recentMatches]: recentMatches });
  }, 500);
}

function saveActionHistory() {
  chrome.storage.local.set({ [STORAGE_KEYS.actionHistory]: actionHistory });
}

function saveActionedHandles() {
  chrome.storage.local.set({ [STORAGE_KEYS.actioned]: actionedHandles });
}

function bumpStat(field) {
  stats[field] = (stats[field] || 0) + 1;
  scheduleSaveStats();
}

function queueProcessAllTweets() {
  if (processQueued) return;
  processQueued = true;
  setTimeout(() => {
    processQueued = false;
    processAllTweets();
  }, 260);
}

function recordRecentMatch(tweetKey, payload) {
  if (matchedTweetKeys.has(tweetKey)) return;

  safeSetAdd(matchedTweetKeys, tweetKey);
  recentMatches.unshift({ ...payload, ts: now() });
  recentMatches = recentMatches.slice(0, MAX_RECENT_MATCHES);
  stats.recentMatchesCount = recentMatches.length;

  bumpStat("matchedTweets");
  scheduleSaveRecent();
  scheduleSaveStats();
}

function markScanned(tweetKey) {
  if (scannedTweetKeys.has(tweetKey)) return;
  safeSetAdd(scannedTweetKeys, tweetKey);
  bumpStat("scannedTweets");
}

function markCacheHit(tweetKey) {
  if (cacheHitTweetKeys.has(tweetKey)) return;
  safeSetAdd(cacheHitTweetKeys, tweetKey);
  bumpStat("cacheHits");
}

function applyVisual(article, evalResult, handle) {
  const key = getTweetKey(article);

  if (!evalResult?.matched || settings.hideMode === "none") {
    clearVisual(article);
    return;
  }

  article.dataset.xgfReason = `location:${evalResult.location}`;

  if (settings.hideMode === "hide") {
    article.classList.add("xgf-hidden");
    article.classList.remove("xgf-dimmed");

    if (!hiddenTweetKeys.has(key)) {
      safeSetAdd(hiddenTweetKeys, key);
      bumpStat("hiddenCount");
    }

    const note = getReasonNode(article);
    if (note) note.remove();
    return;
  }

  article.classList.remove("xgf-hidden");
  article.classList.add("xgf-dimmed");

  if (!dimmedTweetKeys.has(key)) {
    safeSetAdd(dimmedTweetKeys, key);
    bumpStat("dimmedCount");
  }

  setReasonNode(
    article,
    `<strong>XGF:</strong> ${handle} · location “${evalResult.location}” matched rule “${evalResult.matchedRule}”`
  );
}

function chooseAutoAction() {
  if (!isEnabled()) return "none";
  return settings.actionMode || "none";
}

function wasActioned(handle, action) {
  const key = `${action}:${handle}`;
  return Boolean(actionedHandles[key]);
}

function markActioned(handle, action) {
  const key = `${action}:${handle}`;
  actionedHandles[key] = now();
  saveActionedHandles();
}

function pruneActionHistory() {
  const oneHourAgo = now() - 60 * 60 * 1000;
  actionHistory = actionHistory.filter((x) => typeof x === "number" && x >= oneHourAgo);
}

function canPerformAutoAction() {
  pruneActionHistory();
  const max = Number(settings.maxAutoActionsPerHour || 0);
  if (max <= 0) return false;
  return actionHistory.length < max;
}

function recordAutoAction() {
  actionHistory.push(now());
  saveActionHistory();
}

function enqueueAction(action, handle, article, meta) {
  if (!action || action === "none") return;
  if (settings.dryRun) return;
  if (!isEnabled()) return;

  if (!article?.isConnected) return;

  const duplicate = actionQueue.find((x) => x.action === action && x.handle === handle);
  if (duplicate) return;

  actionQueue.push({ action, handle, article, meta, enqueuedAt: now() });
  runActionQueue();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(selectorOrFn, timeoutMs = 1800, intervalMs = 110) {
  const started = now();
  while (now() - started < timeoutMs) {
    const value = typeof selectorOrFn === "function"
      ? selectorOrFn()
      : document.querySelector(selectorOrFn);

    if (value) return value;
    await sleep(intervalMs);
  }
  return null;
}

async function clickAwayMenu() {
  document.dispatchEvent(new KeyboardEvent("keydown", {
    key: "Escape",
    bubbles: true,
    cancelable: true
  }));
  await sleep(120);
}

function findTweetMenuButton(article) {
  const selectors = [
    'button[data-testid="caret"]',
    'button[aria-label="More"]',
    'button[aria-label*="More"]',
    'div[aria-label="More"]'
  ];

  for (const selector of selectors) {
    const btn = article.querySelector(selector);
    if (btn) return btn;
  }

  return null;
}

async function performXAction(action, handle, article) {
  if (!article || !article.isConnected) return false;

  const wasHidden = article.classList.contains("xgf-hidden");
  if (wasHidden) article.classList.remove("xgf-hidden");

  try {
    const button = findTweetMenuButton(article);
    if (!button) return false;

    button.click();

    const menuItems = await waitFor(() => {
      const items = [...document.querySelectorAll('div[role="menuitem"], a[role="menuitem"]')];
      return items.length ? items : null;
    }, 2200, 120);

    if (!menuItems?.length) return false;

    const target = menuItems.find((item) => {
      const text = (item.innerText || "").toLowerCase();
      if (action === "mute") return text.includes("mute") && !text.includes("unmute");
      if (action === "block") return text.includes("block") && !text.includes("unblock");
      return false;
    });

    if (!target) {
      await clickAwayMenu();
      return false;
    }

    target.click();

    if (action === "block") {
      const confirm = await waitFor('[data-testid="confirmationSheetConfirm"]', 2200, 120);
      if (confirm) confirm.click();
    }

    await sleep(250);
    await clickAwayMenu();
    return true;
  } finally {
    if (wasHidden && settings.hideMode === "hide") {
      article.classList.add("xgf-hidden");
    }
  }
}

async function runActionQueue() {
  if (queueRunning) return;
  queueRunning = true;

  try {
    while (actionQueue.length) {
      if (!isEnabled() || settings.dryRun) {
        actionQueue.length = 0;
        break;
      }

      const item = actionQueue.shift();
      if (!item) continue;
      if (!item.article?.isConnected) continue;
      if (wasActioned(item.handle, item.action)) continue;
      if (!canPerformAutoAction()) continue;

      const delay = Math.max(500, Number(settings.actionDelayMs || 2500));
      await sleep(delay);

      const ok = await performXAction(item.action, item.handle, item.article);
      if (!ok) continue;

      recordAutoAction();
      markActioned(item.handle, item.action);

      if (item.action === "mute") bumpStat("mutedCount");
      if (item.action === "block") bumpStat("blockedCount");
    }
  } finally {
    queueRunning = false;
  }
}

function processTweetArticle(article) {
  if (!(article instanceof HTMLElement)) return;

  const tweetKey = getTweetKey(article);
  markScanned(tweetKey);

  const currentVersion = Number(article.dataset.xgfVersion || "0");
  if (currentVersion === cacheVersion) return;
  article.dataset.xgfVersion = String(cacheVersion);

  if (!isEnabled()) {
    clearVisual(article);
    clearFlag(article);
    return;
  }

  const handle = getHandleFromArticle(article);
  if (!handle) {
    clearFlag(article);
    return;
  }

  queueAboutLookup(handle);

  const entry = locationCache[handle];
  const resolvedLocation = normalizeLocation(
    entry?.location || entry?.basedIn || entry?.connectedVia || ""
  );

  applyFlagBadge(article, handle, resolvedLocation);

  if (!resolvedLocation) {
    clearVisual(article);
    return;
  }

  if (whitelistSet.has(handle)) {
    clearVisual(article);
    return;
  }

  markCacheHit(tweetKey);

  const evalResult = evaluateLocation(resolvedLocation);
  if (!evalResult.matched) {
    clearVisual(article);
    return;
  }

  recordRecentMatch(tweetKey, {
    handle,
    location: evalResult.location,
    matchedRule: evalResult.matchedRule,
    action: chooseAutoAction(),
    dryRun: Boolean(settings.dryRun)
  });

  applyVisual(article, evalResult, handle);

  const action = chooseAutoAction();
  if (!action || action === "none") return;

  sightingsByHandle[handle] = (sightingsByHandle[handle] || 0) + 1;
  const neededSightings = Math.max(1, Number(settings.minSightingsBeforeAction || 1));
  if (sightingsByHandle[handle] < neededSightings) return;

  if (settings.dryRun) return;
  enqueueAction(action, handle, article, evalResult);
}

function processAllTweets() {
  captureAboutLocationFromDom();

  const tweets = document.querySelectorAll('article[data-testid="tweet"], article');
  for (const article of tweets) processTweetArticle(article);
}

function startObserver() {
  if (observer) observer.disconnect();

  observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;

        if (node.matches?.('article[data-testid="tweet"], article')) {
          processTweetArticle(node);
        }

        const nested = node.querySelectorAll?.('article[data-testid="tweet"], article');
        if (nested?.length) {
          for (const article of nested) processTweetArticle(article);
        }
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
}

function setupStorageListener() {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes[STORAGE_KEYS.settings]) {
      settings = normalizeSettings(changes[STORAGE_KEYS.settings].newValue || {});
      whitelistSet = new Set((settings.whitelistHandles || []).map(normalizeHandle));
      cacheVersion += 1;
      queueProcessAllTweets();
    }

    if (area === "local" && changes[STORAGE_KEYS.cache]) {
      const incoming = changes[STORAGE_KEYS.cache].newValue || {};
      const filtered = {};

      for (const [handle, entry] of Object.entries(incoming)) {
        if (!entry || typeof entry !== "object") continue;
        if (entry.source !== "about") continue;
        filtered[normalizeHandle(handle)] = entry;
      }

      locationCache = filtered;
      cacheVersion += 1;
      queueProcessAllTweets();
    }
  });
}

async function storageGet(area, key) {
  return new Promise((resolve) => {
    chrome.storage[area].get(key, (res) => resolve(res?.[key]));
  });
}

async function loadState() {
  const [savedSettings, savedCache, savedStats, savedHistory, savedActioned, savedRecent] = await Promise.all([
    storageGet("sync", STORAGE_KEYS.settings),
    storageGet("local", STORAGE_KEYS.cache),
    storageGet("local", STORAGE_KEYS.stats),
    storageGet("local", STORAGE_KEYS.actionHistory),
    storageGet("local", STORAGE_KEYS.actioned),
    storageGet("local", STORAGE_KEYS.recentMatches)
  ]);

  settings = normalizeSettings(savedSettings || {});
  if (!savedSettings) {
    chrome.storage.sync.set({ [STORAGE_KEYS.settings]: settings });
  }

  whitelistSet = new Set((settings.whitelistHandles || []).map(normalizeHandle));

  const rawCache = savedCache || {};
  locationCache = {};
  for (const [handle, entry] of Object.entries(rawCache)) {
    if (!entry || typeof entry !== "object") continue;
    if (entry.source !== "about") continue;
    locationCache[normalizeHandle(handle)] = entry;
  }

  if (Object.keys(rawCache).length !== Object.keys(locationCache).length) {
    scheduleSaveCache();
  }

  stats = { ...DEFAULT_STATS, ...(savedStats || {}) };
  actionHistory = Array.isArray(savedHistory) ? savedHistory : [];
  actionedHandles = savedActioned || {};
  recentMatches = Array.isArray(savedRecent) ? savedRecent.slice(0, MAX_RECENT_MATCHES) : [];

  if (stats.recentMatchesCount !== recentMatches.length) {
    stats.recentMatchesCount = recentMatches.length;
    scheduleSaveStats();
  }
}

async function init() {
  await loadState();

  setupStorageListener();
  startObserver();

  setTimeout(processAllTweets, 1200);
  setInterval(processAllTweets, 4000);
}

init();
