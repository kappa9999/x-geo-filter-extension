(() => {
  const SOURCE = "xgf-inpage";
  const MAX_WALK_DEPTH = 40;
  const MAX_WALK_NODES = 60000;

  function emit(type, payload) {
    window.postMessage({ source: SOURCE, type, ...payload }, "*");
  }

  function normalizeHandle(handle) {
    if (!handle || typeof handle !== "string") return "";
    return handle.replace(/^@/, "").trim().toLowerCase();
  }

  function pickLocation(value) {
    if (!value) return "";
    if (typeof value === "string") return value.trim();

    if (typeof value === "object") {
      const candidates = [
        value.location,
        value.full_name,
        value.name,
        value.localized_name,
        value.display_name
      ];
      for (const c of candidates) {
        if (typeof c === "string" && c.trim()) return c.trim();
      }
    }

    return "";
  }

  function maybePush(out, handleRaw, locationRaw) {
    const handle = normalizeHandle(handleRaw);
    const location = pickLocation(locationRaw);
    if (!handle || !location) return;

    out.push({
      handle,
      location,
      ts: Date.now()
    });
  }

  function fromUserNode(node, out) {
    if (!node || typeof node !== "object") return;

    const legacy = node.legacy && typeof node.legacy === "object" ? node.legacy : null;

    const handleCandidates = [
      node.screen_name,
      legacy?.screen_name,
      node.username,
      legacy?.username,
      node.handle,
      node.user_handle,
      node.core?.screen_name,
      node.core?.username
    ];

    const locationCandidates = [
      node.location,
      legacy?.location,
      node.profile_location,
      legacy?.profile_location,
      node.location_info,
      legacy?.location_info,
      node.location_label,
      node.profile?.location,
      node.profile?.location_info,
      node.core?.location,
      node.core?.profile_location
    ];

    const handle = handleCandidates.find((x) => typeof x === "string" && x.trim());
    const location = locationCandidates.find((x) => x != null);

    maybePush(out, handle, location);

    if (node.core?.user_results?.result) {
      fromUserNode(node.core.user_results.result, out);
    }

    if (node.user_results?.result) {
      fromUserNode(node.user_results.result, out);
    }

    if (node.result && typeof node.result === "object") {
      fromUserNode(node.result, out);
    }
  }

  function deepWalk(node, out, state, depth = 0) {
    if (!node || !state || depth > MAX_WALK_DEPTH) return;

    state.visited += 1;
    if (state.visited > MAX_WALK_NODES) return;

    if (Array.isArray(node)) {
      for (const item of node) deepWalk(item, out, state, depth + 1);
      return;
    }

    if (typeof node !== "object") return;

    fromUserNode(node, out);

    for (const value of Object.values(node)) {
      if (value && typeof value === "object") {
        deepWalk(value, out, state, depth + 1);
      }
    }
  }

  function processJsonPayload(jsonData) {
    try {
      const found = [];
      deepWalk(jsonData, found, { visited: 0 }, 0);

      if (!found.length) return;

      const dedup = new Map();
      for (const item of found) {
        const key = `${item.handle}|${item.location.toLowerCase()}`;
        if (!dedup.has(key)) dedup.set(key, item);
      }

      emit("userLocationBatch", { users: [...dedup.values()] });
    } catch (_) {
      // ignore
    }
  }

  function processMaybeJson(text) {
    if (!text || typeof text !== "string") return;
    const trimmed = text.trim();
    if (!trimmed) return;

    let candidate = trimmed;
    if (!(candidate.startsWith("{") || candidate.startsWith("["))) {
      const idxObject = candidate.indexOf("{");
      const idxArray = candidate.indexOf("[");
      const indices = [idxObject, idxArray].filter((x) => x >= 0).sort((a, b) => a - b);
      if (!indices.length) return;
      candidate = candidate.slice(indices[0]);
    }

    try {
      processJsonPayload(JSON.parse(candidate));
    } catch (_) {
      // ignore
    }
  }

  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);

    try {
      const req = args[0];
      const url = typeof req === "string" ? req : req?.url;
      if (url && (url.includes("/i/api/") || url.includes("api.x.com"))) {
        response
          .clone()
          .text()
          .then(processMaybeJson)
          .catch(() => {});
      }
    } catch (_) {
      // ignore
    }

    return response;
  };

  const xhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__xgfUrl = typeof url === "string" ? url : String(url || "");
    return xhrOpen.call(this, method, url, ...rest);
  };

  const xhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (...args) {
    this.addEventListener("load", () => {
      try {
        if (!this.__xgfUrl) return;
        if (!this.__xgfUrl.includes("/i/api/") && !this.__xgfUrl.includes("api.x.com")) return;

        if (typeof this.responseText === "string") {
          processMaybeJson(this.responseText);
        }
      } catch (_) {
        // ignore
      }
    });

    return xhrSend.apply(this, args);
  };

  emit("ready", { ok: true });
})();
