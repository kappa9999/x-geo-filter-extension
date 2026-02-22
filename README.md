# X Geo Filter Guard

X Geo Filter Guard is a Chrome extension for X (x.com / twitter.com) that helps you reduce spam and low-quality feed noise using region-based rules.

It supports three control modes:

1. **Hide/Dim posts** (no account action)
2. **Auto Mute** matching accounts
3. **Auto Block** matching accounts

---

## Key capabilities

- Region include/exclude matching
- Handle whitelist support
- Feed-level filtering (hide, dim, or no visual filter)
- Optional auto-mute and auto-block workflows
- Safety controls (dry run, rate limit, delay, minimum sightings)
- Popup quick controls (pause/resume, enable/disable)
- Runtime stats and recent match history
- Settings export/import

---

## Typical use cases

- Hide posts from accounts matching a target country/region
- Automatically mute matching accounts
- Automatically block matching accounts
- Keep a conservative setup for review first, then enable actions

---

## Download

Latest release:

- https://github.com/kappa9999/x-geo-filter-extension/releases/latest

Download the ZIP asset (`x-geo-filter-extension-vX.Y.Z.zip`) and unzip it.

---

## Install in Chrome

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (top-right)
3. Click **Load unpacked**
4. Select the extracted `x-geo-filter-extension` folder

To update later:

1. Download and unzip the new release
2. Replace your local extension folder
3. Open `chrome://extensions`
4. Click **Reload** on X Geo Filter Guard

---

## UI screenshots

### Popup controls

<p>
  <img src="docs/screenshots/popup.png" alt="Popup controls" width="320" />
</p>

### Full settings page

<p>
  <img src="docs/screenshots/options-page.png" alt="Extension settings page" width="950" />
</p>

Detailed visual walkthrough:
- `docs/USAGE-WITH-IMAGES.md`

---

## Quick configuration

1. Open extension popup -> **Open settings**
2. Add Include rules (one per line), for example:
   - `india`
   - `nigeria`
3. Choose your mode:

| Objective | Post behavior | Auto action |
|---|---|---|
| Hide content only | Hide or Dim | None |
| Mute matching accounts | Hide/Dim/None | Mute |
| Block matching accounts | Hide/Dim/None | Block |

4. Click **Save settings**
5. Refresh X and scroll your feed

---

## Recommended safety settings (for mute/block)

Before enabling real account actions:

- Keep **Dry run** ON
- Use low **Max auto actions/hour** (for example 1-2)
- Set **Delay between actions** (for example 3000 ms)
- Set **Sightings before action** to 2+

After behavior is validated, disable Dry run if desired.

---

## Matching data source

When available, matching uses account About signals (instead of custom profile bio text), including:

- Account based in
- Connected via

Rules are then applied using include/exclude lists plus whitelist handles.

---

## Emergency controls

From popup you can immediately:

- Disable the extension
- Set action mode to `None`
- Pause processing for 30 minutes

---

## Troubleshooting

If no filtering occurs:

1. Confirm extension is enabled
2. Confirm Include rules are not empty
3. Reload your X tab

If results look stale:

1. Open settings
2. Click **Clear location cache**
3. Reload extension from `chrome://extensions`

If auto-mute/auto-block stops working:

- X may have changed UI structure; selector updates may be required.

---

## License

MIT
