const STORAGE_KEYS = {
  settings: "xgf_settings",
  stats: "xgf_stats",
  recentMatches: "xgf_recent_matches"
};

const DEFAULT_SETTINGS = {
  enabled: true,
  pauseUntil: 0,
  hideMode: "dim",
  actionMode: "none",
  dryRun: true
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
  dryRun: document.getElementById("dryRun"),
  hideMode: document.getElementById("hideMode"),
  actionMode: document.getElementById("actionMode"),
  statusBadge: document.getElementById("statusBadge"),
  stats: document.getElementById("stats"),
  pause30: document.getElementById("pause30"),
  resume: document.getElementById("resume"),
  openOptions: document.getElementById("openOptions"),
  refresh: document.getElementById("refresh")
};

let settings = { ...DEFAULT_SETTINGS };

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

  merged.enabled = Boolean(merged.enabled);
  merged.dryRun = Boolean(merged.dryRun);
  merged.pauseUntil = Math.max(0, Number(merged.pauseUntil || 0));

  return merged;
}

function updateBadge() {
  const pausedMs = Math.max(0, Number(settings.pauseUntil || 0) - Date.now());

  if (!settings.enabled) {
    refs.statusBadge.textContent = "Disabled";
    refs.statusBadge.style.background = "#3a2323";
    refs.statusBadge.style.borderColor = "#6b3838";
    refs.statusBadge.style.color = "#ffb4b4";
    return;
  }

  if (pausedMs > 0) {
    refs.statusBadge.textContent = `Paused ${Math.ceil(pausedMs / 60000)}m`;
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

function renderControls() {
  refs.enabled.checked = settings.enabled;
  refs.dryRun.checked = settings.dryRun;
  refs.hideMode.value = settings.hideMode;
  refs.actionMode.value = settings.actionMode;
  updateBadge();
}

function renderStats(statsRaw, recentRaw) {
  const stats = { ...DEFAULT_STATS, ...(statsRaw || {}) };
  const recent = Array.isArray(recentRaw) ? recentRaw : [];

  const last = stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleString() : "never";
  refs.stats.innerHTML = `
    Scanned: <strong>${stats.scannedTweets || 0}</strong><br>
    Matched: <strong>${stats.matchedTweets || 0}</strong><br>
    Hidden/Dimmed: <strong>${stats.hiddenCount || 0}</strong> / <strong>${stats.dimmedCount || 0}</strong><br>
    Auto mute/block: <strong>${stats.mutedCount || 0}</strong> / <strong>${stats.blockedCount || 0}</strong><br>
    Cache hits: <strong>${stats.cacheHits || 0}</strong><br>
    Recent matches: <strong>${recent.length}</strong><br>
    Updated: <strong>${last}</strong>
  `;
}

async function loadAll() {
  const [savedSettings, stats, recent] = await Promise.all([
    storageGet("sync", STORAGE_KEYS.settings),
    storageGet("local", STORAGE_KEYS.stats),
    storageGet("local", STORAGE_KEYS.recentMatches)
  ]);

  settings = normalizeSettings(savedSettings || {});
  renderControls();
  renderStats(stats, recent);
}

async function saveSettings() {
  await storageSet("sync", { [STORAGE_KEYS.settings]: settings });
}

refs.enabled.addEventListener("change", async () => {
  settings.enabled = refs.enabled.checked;
  renderControls();
  await saveSettings();
});

refs.dryRun.addEventListener("change", async () => {
  settings.dryRun = refs.dryRun.checked;
  await saveSettings();
});

refs.hideMode.addEventListener("change", async () => {
  settings.hideMode = refs.hideMode.value;
  await saveSettings();
});

refs.actionMode.addEventListener("change", async () => {
  settings.actionMode = refs.actionMode.value;
  await saveSettings();
});

refs.pause30.addEventListener("click", async () => {
  settings.enabled = true;
  settings.pauseUntil = Date.now() + 30 * 60 * 1000;
  renderControls();
  await saveSettings();
});

refs.resume.addEventListener("click", async () => {
  settings.pauseUntil = 0;
  settings.enabled = true;
  renderControls();
  await saveSettings();
});

refs.openOptions.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

refs.refresh.addEventListener("click", loadAll);

loadAll();
