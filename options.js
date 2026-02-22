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
  hideMode: "dim",
  actionMode: "none",
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

const refs = {
  enabled: document.getElementById("enabled"),
  statusBadge: document.getElementById("statusBadge"),
  includeRules: document.getElementById("includeRules"),
  excludeRules: document.getElementById("excludeRules"),
  whitelistHandles: document.getElementById("whitelistHandles"),
  hideMode: document.getElementById("hideMode"),
  actionMode: document.getElementById("actionMode"),
  dryRun: document.getElementById("dryRun"),
  strictWordMatch: document.getElementById("strictWordMatch"),
  showReasonBadge: document.getElementById("showReasonBadge"),
  maxAutoActionsPerHour: document.getElementById("maxAutoActionsPerHour"),
  actionDelayMs: document.getElementById("actionDelayMs"),
  minSightingsBeforeAction: document.getElementById("minSightingsBeforeAction"),
  testLocation: document.getElementById("testLocation"),
  testHandle: document.getElementById("testHandle"),
  runMatcher: document.getElementById("runMatcher"),
  matcherOutput: document.getElementById("matcherOutput"),
  statScanned: document.getElementById("statScanned"),
  statMatched: document.getElementById("statMatched"),
  statHidden: document.getElementById("statHidden"),
  statDimmed: document.getElementById("statDimmed"),
  statMuted: document.getElementById("statMuted"),
  statBlocked: document.getElementById("statBlocked"),
  statCacheHits: document.getElementById("statCacheHits"),
  statRecentCount: document.getElementById("statRecentCount"),
  statLastUpdated: document.getElementById("statLastUpdated"),
  recentMatchesBody: document.getElementById("recentMatchesBody"),
  refreshStats: document.getElementById("refreshStats"),
  settingsBlob: document.getElementById("settingsBlob"),
  exportSettings: document.getElementById("exportSettings"),
  importSettingsBtn: document.getElementById("importSettingsBtn"),
  clearCache: document.getElementById("clearCache"),
  clearStats: document.getElementById("clearStats"),
  clearActions: document.getElementById("clearActions"),
  clearRecent: document.getElementById("clearRecent"),
  save: document.getElementById("save"),
  resetDefaults: document.getElementById("resetDefaults"),
  status: document.getElementById("status")
};

let currentSettings = { ...DEFAULT_SETTINGS };

function setStatus(text) {
  refs.status.textContent = text;
  setTimeout(() => {
    if (refs.status.textContent === text) refs.status.textContent = "";
  }, 2200);
}

function storageGet(area, key) {
  return new Promise((resolve) => {
    chrome.storage[area].get(key, (res) => resolve(res?.[key]));
  });
}

function storageSet(area, payload) {
  return new Promise((resolve) => {
    chrome.storage[area].set(payload, () => resolve());
  });
}

function uniqueStrings(values) {
  const seen = new Set();
  const out = [];
  for (const raw of values || []) {
    const value = String(raw || "").trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function normalizeHandle(handle) {
  return String(handle || "").replace(/^@/, "").trim().toLowerCase();
}

function parseList(text) {
  return uniqueStrings(
    String(text || "")
      .split(/\n|,/g)
      .map((v) => v.trim())
      .filter(Boolean)
  );
}

function escRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

  if (!["hide", "dim", "none"].includes(merged.hideMode)) merged.hideMode = "hide";
  if (!["none", "mute", "block"].includes(merged.actionMode)) merged.actionMode = "none";

  merged.locationRules = uniqueStrings(merged.locationRules || []);
  merged.excludeLocationRules = uniqueStrings(merged.excludeLocationRules || []);
  merged.whitelistHandles = uniqueStrings((merged.whitelistHandles || []).map(normalizeHandle));

  merged.enabled = Boolean(merged.enabled);
  merged.pauseUntil = Math.max(0, Number(merged.pauseUntil || 0));
  merged.dryRun = Boolean(merged.dryRun);
  merged.strictWordMatch = Boolean(merged.strictWordMatch);
  merged.showReasonBadge = Boolean(merged.showReasonBadge);

  merged.maxAutoActionsPerHour = Math.max(0, Math.min(100, Number(merged.maxAutoActionsPerHour || 0)));
  merged.actionDelayMs = Math.max(500, Math.min(30000, Number(merged.actionDelayMs || 2500)));
  merged.minSightingsBeforeAction = Math.max(1, Math.min(20, Number(merged.minSightingsBeforeAction || 1)));

  return merged;
}

function updateStatusBadge(settings) {
  const pausedMs = Math.max(0, Number(settings.pauseUntil || 0) - Date.now());
  const paused = pausedMs > 0;
  if (!settings.enabled) {
    refs.statusBadge.textContent = "Disabled";
    refs.statusBadge.style.background = "#3a2323";
    refs.statusBadge.style.borderColor = "#6b3838";
    refs.statusBadge.style.color = "#ffb4b4";
    return;
  }

  if (paused) {
    const mins = Math.ceil(pausedMs / 60000);
    refs.statusBadge.textContent = `Paused (${mins}m)`;
    refs.statusBadge.style.background = "#3c351f";
    refs.statusBadge.style.borderColor = "#6d5f2c";
    refs.statusBadge.style.color = "#f2d98b";
    return;
  }

  refs.statusBadge.textContent = "Active";
  refs.statusBadge.style.background = "#173446";
  refs.statusBadge.style.borderColor = "#2f4d61";
  refs.statusBadge.style.color = "#9fd3ff";
}

function renderSettings(settings) {
  currentSettings = normalizeSettings(settings);

  refs.enabled.checked = currentSettings.enabled;
  refs.includeRules.value = currentSettings.locationRules.join("\n");
  refs.excludeRules.value = currentSettings.excludeLocationRules.join("\n");
  refs.whitelistHandles.value = currentSettings.whitelistHandles.join("\n");
  refs.hideMode.value = currentSettings.hideMode;
  refs.actionMode.value = currentSettings.actionMode;
  refs.dryRun.checked = currentSettings.dryRun;
  refs.strictWordMatch.checked = currentSettings.strictWordMatch;
  refs.showReasonBadge.checked = currentSettings.showReasonBadge;
  refs.maxAutoActionsPerHour.value = currentSettings.maxAutoActionsPerHour;
  refs.actionDelayMs.value = currentSettings.actionDelayMs;
  refs.minSightingsBeforeAction.value = currentSettings.minSightingsBeforeAction;

  updateStatusBadge(currentSettings);
}

function renderStats(statsRaw, recentRaw) {
  const stats = { ...DEFAULT_STATS, ...(statsRaw || {}) };
  const recent = Array.isArray(recentRaw) ? recentRaw : [];

  refs.statScanned.textContent = stats.scannedTweets || 0;
  refs.statMatched.textContent = stats.matchedTweets || 0;
  refs.statHidden.textContent = stats.hiddenCount || 0;
  refs.statDimmed.textContent = stats.dimmedCount || 0;
  refs.statMuted.textContent = stats.mutedCount || 0;
  refs.statBlocked.textContent = stats.blockedCount || 0;
  refs.statCacheHits.textContent = stats.cacheHits || 0;
  refs.statRecentCount.textContent = recent.length;
  refs.statLastUpdated.textContent = stats.lastUpdated
    ? new Date(stats.lastUpdated).toLocaleString()
    : "never";

  refs.recentMatchesBody.innerHTML = "";

  if (!recent.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="5" class="muted">No recent matches yet.</td>`;
    refs.recentMatchesBody.appendChild(row);
    return;
  }

  for (const item of recent.slice(0, 80)) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.ts ? new Date(item.ts).toLocaleTimeString() : "-"}</td>
      <td>@${item.handle || "-"}</td>
      <td>${item.location || "-"}</td>
      <td>${item.matchedRule || "-"}</td>
      <td>${item.action || "none"}${item.dryRun ? " (dry)" : ""}</td>
    `;
    refs.recentMatchesBody.appendChild(row);
  }
}

function collectSettingsFromForm() {
  return normalizeSettings({
    enabled: refs.enabled.checked,
    pauseUntil: currentSettings.pauseUntil || 0,
    locationRules: parseList(refs.includeRules.value),
    excludeLocationRules: parseList(refs.excludeRules.value),
    whitelistHandles: parseList(refs.whitelistHandles.value).map(normalizeHandle),
    hideMode: refs.hideMode.value,
    actionMode: refs.actionMode.value,
    dryRun: refs.dryRun.checked,
    strictWordMatch: refs.strictWordMatch.checked,
    showReasonBadge: refs.showReasonBadge.checked,
    maxAutoActionsPerHour: Number(refs.maxAutoActionsPerHour.value || 0),
    actionDelayMs: Number(refs.actionDelayMs.value || 2500),
    minSightingsBeforeAction: Number(refs.minSightingsBeforeAction.value || 1)
  });
}

function locationContainsRule(locationLower, ruleLower, strictWordMatch) {
  if (!strictWordMatch) return locationLower.includes(ruleLower);
  if (ruleLower.includes(" ")) return locationLower.includes(ruleLower);
  return new RegExp(`(^|[^a-z0-9])${escRegex(ruleLower)}([^a-z0-9]|$)`, "i").test(locationLower);
}

function runMatcherPreview() {
  const s = collectSettingsFromForm();
  const location = String(refs.testLocation.value || "").trim();
  const handle = normalizeHandle(refs.testHandle.value || "");

  if (!location) {
    refs.matcherOutput.textContent = "Enter location text first.";
    return;
  }

  if (handle && s.whitelistHandles.includes(handle)) {
    refs.matcherOutput.textContent = `@${handle} is whitelisted -> not matched.`;
    return;
  }

  const locLower = location.toLowerCase();
  const matchedRule = s.locationRules
    .map((r) => r.toLowerCase())
    .find((rule) => locationContainsRule(locLower, rule, s.strictWordMatch));

  if (!matchedRule) {
    refs.matcherOutput.textContent = "No include rule matched.";
    return;
  }

  const excludedBy = s.excludeLocationRules
    .map((r) => r.toLowerCase())
    .find((rule) => locationContainsRule(locLower, rule, s.strictWordMatch));

  if (excludedBy) {
    refs.matcherOutput.textContent = `Matched include “${matchedRule}” but excluded by “${excludedBy}”.`;
    return;
  }

  refs.matcherOutput.textContent = `MATCHED by “${matchedRule}” · hideMode=${s.hideMode} · actionMode=${s.actionMode}${s.dryRun ? " (dry-run)" : ""}`;
}

async function loadEverything() {
  const [savedSettings, stats, recent] = await Promise.all([
    storageGet("sync", STORAGE_KEYS.settings),
    storageGet("local", STORAGE_KEYS.stats),
    storageGet("local", STORAGE_KEYS.recentMatches)
  ]);

  renderSettings(savedSettings || {});
  renderStats(stats, recent);
}

async function saveSettings() {
  const settings = collectSettingsFromForm();
  await storageSet("sync", { [STORAGE_KEYS.settings]: settings });
  currentSettings = settings;
  updateStatusBadge(settings);
  setStatus("Saved settings");
}

async function resetDefaults() {
  renderSettings(DEFAULT_SETTINGS);
  await saveSettings();
  setStatus("Reset to defaults");
}

async function clearCache() {
  await storageSet("local", { [STORAGE_KEYS.cache]: {} });
  setStatus("Cleared location cache");
}

async function clearStats() {
  await storageSet("local", { [STORAGE_KEYS.stats]: { ...DEFAULT_STATS } });
  await loadEverything();
  setStatus("Stats reset");
}

async function clearActions() {
  await storageSet("local", {
    [STORAGE_KEYS.actionHistory]: [],
    [STORAGE_KEYS.actioned]: {}
  });
  setStatus("Action history cleared");
}

async function clearRecent() {
  const stats = (await storageGet("local", STORAGE_KEYS.stats)) || {};
  stats.recentMatchesCount = 0;
  await storageSet("local", {
    [STORAGE_KEYS.recentMatches]: [],
    [STORAGE_KEYS.stats]: stats
  });
  await loadEverything();
  setStatus("Recent matches cleared");
}

function addRuleFromChip(rule) {
  const current = parseList(refs.includeRules.value);
  current.push(rule);
  refs.includeRules.value = uniqueStrings(current).join("\n");
}

function exportSettingsJson() {
  const settings = collectSettingsFromForm();
  refs.settingsBlob.value = JSON.stringify(settings, null, 2);
  refs.settingsBlob.focus();
  refs.settingsBlob.select();
  setStatus("Exported to text box");
}

async function importSettingsJson() {
  const raw = refs.settingsBlob.value.trim();
  if (!raw) {
    setStatus("Paste JSON into the box first");
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    setStatus("Invalid JSON");
    return;
  }

  const normalized = normalizeSettings(parsed);
  await storageSet("sync", { [STORAGE_KEYS.settings]: normalized });
  renderSettings(normalized);
  setStatus("Imported settings");
}

refs.save.addEventListener("click", saveSettings);
refs.resetDefaults.addEventListener("click", resetDefaults);
refs.clearCache.addEventListener("click", clearCache);
refs.clearStats.addEventListener("click", clearStats);
refs.clearActions.addEventListener("click", clearActions);
refs.clearRecent.addEventListener("click", clearRecent);
refs.runMatcher.addEventListener("click", runMatcherPreview);
refs.refreshStats.addEventListener("click", loadEverything);
refs.exportSettings.addEventListener("click", exportSettingsJson);
refs.importSettingsBtn.addEventListener("click", importSettingsJson);
refs.enabled.addEventListener("change", () => updateStatusBadge(collectSettingsFromForm()));

for (const chip of document.querySelectorAll("button.chip[data-rule]")) {
  chip.addEventListener("click", () => addRuleFromChip(chip.dataset.rule));
}

loadEverything();
