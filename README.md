# X Geo Filter Guard

Simple Chrome extension for X (x.com / twitter.com) focused on **bot/spam account prevention by region**.

You can choose one of 3 behaviors for accounts that match your country/region rules:

1. **Hide posts** (do not block or mute)
2. **Auto mute accounts**
3. **Auto block accounts**

---

## What this is for

If your feed gets flooded by low-quality, spam, or bot-like accounts from specific regions, this extension lets you filter aggressively.

Examples:
- Hide every post from accounts based in a target country
- Auto mute every matching account from a target country
- Auto block every matching account from a target country

---

## Download

1. Open latest release:
   - https://github.com/kappa9999/x-geo-filter-extension/releases/latest
2. Download:
   - `x-geo-filter-extension-v0.2.2.zip`
3. Unzip it (you should get folder `x-geo-filter-extension`)

---

## Install in Chrome (easy)

1. Open Chrome
2. Go to `chrome://extensions`
3. Turn ON **Developer mode** (top-right)
4. Click **Load unpacked**
5. Select the unzipped `x-geo-filter-extension` folder

Done.

---

## Retard-proof setup guide (non-technical)

After install:

1. Click the extension icon
2. Click **Open settings**
3. In **Include rules**, type one country per line (example: `india`)
4. Pick your mode:

### Mode A: Hide only (no account action)
- Post behavior: `Hide` (or `Dim`)
- Auto action: `None`

Result: matched posts disappear (or dim), but users are not muted/blocked.

### Mode B: Mute every matching account
- Post behavior: `Hide` or `Dim`
- Auto action: `Mute`
- Dry run: `On` first, then `Off` after testing

Result: matching accounts are automatically muted.

### Mode C: Block every matching account
- Post behavior: `Hide` or `None`
- Auto action: `Block`
- Dry run: `On` first, then `Off` after testing
- Recommended safety: max actions/hour `1-2`, delay `3000ms`, sightings `2+`

Result: matching accounts are automatically blocked.

5. Click **Save settings**
6. Refresh X and scroll

---

## Important: how matching works

The extension checks account geography signals from account About data (not custom bio text when About data is available), then applies your rules.

So if you put `india` in Include rules, it targets accounts whose About signals map to India.

---

## Emergency stop

From popup, instantly:
- Disable extension
- Set Auto action to `None`
- Pause for 30 minutes

---

## Troubleshooting

- No changes in feed:
  - Make sure extension is enabled
  - Make sure Include rules are not empty
  - Reload X tab
- Wrong/outdated matching:
  - Open settings -> **Clear location cache**
  - Reload extension in `chrome://extensions`
- Auto mute/block not clicking:
  - X UI may have changed; selector updates may be needed

---

## License

MIT
