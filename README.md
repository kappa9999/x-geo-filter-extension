# X Geo Filter Guard

No-auth Chrome extension (MV3) for **x.com / twitter.com** that filters feed posts by account geography signals from each account’s **About** data.

> Built for users who want region-based feed control without API keys or OAuth setup.

---

## Features

- ✅ Region include/exclude rules
- ✅ Handle whitelist (never filter selected accounts)
- ✅ Tiny flag badge on each tweet/account
  - country flag when inferred
  - white flag fallback when unknown
- ✅ Feed behavior modes
  - `Hide`
  - `Dim`
  - `No visual filter`
- ✅ Optional auto actions
  - `Auto mute`
  - `Auto block`
- ✅ Safety controls
  - Dry run
  - Max actions/hour
  - Delay between actions
  - Min sightings before action
  - Pause/resume
- ✅ Rule tester in options page
- ✅ Runtime dashboard (stats + recent matches)
- ✅ Export/import settings JSON

---

## Install (Unpacked)

1. Open Chrome: `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this project folder (`x-geo-filter-extension`)

---

## Quick Start (Safe)

1. Open extension **Options**
2. Add include rule(s), e.g.:
   - `india`
3. Set:
   - **Post behavior**: `Dim`
   - **Auto action**: `None`
   - **Dry run**: `On`
4. Save settings
5. Open X and scroll feed
6. Watch Runtime Dashboard counters update

---

## Testing Playbooks

### A) Hide/Dim without blocking
Use this when you only want content suppression.

- `Post behavior`: `Hide` or `Dim`
- `Auto action`: `None`
- `Dry run`: either on/off (no effect when action is None)

Expected:
- matched tweets hide/dim
- muted/blocked counters stay at 0

### B) Test auto-block safely first (simulation)

- `Post behavior`: `No visual filter` (optional; easier to observe)
- `Auto action`: `Block`
- `Dry run`: `On`
- `Max actions/hour`: `1-2`
- `Delay`: `3000ms`
- `Sightings`: `2+`

Expected:
- recent matches show `block` intent
- no real blocks occur while dry run is on

### C) Enable real blocking

Only after simulation looks correct:

- turn **Dry run** off
- keep strict guardrails (low max/hour, delay, sightings)

Emergency stop:
- popup → disable extension
- popup → set action mode to `None`
- popup → pause for 30m

---

## How Location Is Determined

The extension does **not** rely on custom profile bio location text.

Primary source (fast path):
- X internal web GraphQL **AboutAccountQuery**
- reads account About signals:
  - `account_based_in`
  - `source` (Connected via)

Fallback:
- `/about` page HTML parsing (if GraphQL path changes/fails)

Then it maps signals to a country code/flag via keyword inference.

---

## Rule Matching

- Case-insensitive
- Include rules decide eligibility
- Exclude rules remove false positives
- Whitelisted handles are always ignored by filtering/actions
- Optional strict word mode for single-word rules

---

## Data & Privacy

No external backend.

Data is stored only in Chrome extension storage:
- `chrome.storage.sync`: settings
- `chrome.storage.local`: cache, stats, action history, recent matches

No API keys required.

---

## Known Limitations

- Some accounts may not expose About signals reliably
- Country mapping is heuristic, not geolocation-grade
- X can change internal GraphQL ids/routes without notice
- UI automation for mute/block can break when X UI changes

---

## Development

Project files:
- `manifest.json` — MV3 manifest
- `content.js` — main runtime/filter logic
- `content.css` — feed styles
- `options.*` — full settings page
- `popup.*` — quick controls

Basic validation:

```bash
node --check content.js
node --check options.js
node --check popup.js
node --check inpage.js
```

Create zip release:

```bash
cd ..
zip -r x-geo-filter-extension.zip x-geo-filter-extension
```

---

## Responsible Use

Use responsibly and in compliance with X policies and local law.
Automation should be conservative and rate-limited.
