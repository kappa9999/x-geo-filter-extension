# X Geo Filter Guard

A Chrome extension for X (x.com / twitter.com) that lets you filter posts by account location signals.

This repo is intentionally simple for non-technical users.

## Download (Easy)

1. Open the latest release:
   - https://github.com/kappa9999/x-geo-filter-extension/releases/latest
2. Download this file:
   - `x-geo-filter-extension-v0.2.1.zip`
3. Unzip it.

You will get a folder named `x-geo-filter-extension`.

## Install in Chrome (Step-by-step)

1. Open Chrome.
2. In the address bar, go to:
   - `chrome://extensions`
3. Turn on **Developer mode** (top-right switch).
4. Click **Load unpacked**.
5. Select the unzipped `x-geo-filter-extension` folder.
6. Done.

If you update later:
- Download the new zip
- Replace old folder
- Go to `chrome://extensions`
- Click **Reload** on the extension

## First-time setup (safe defaults)

1. Click the extension icon.
2. Click **Open settings**.
3. Add your include rule(s), one per line, for example:
   - `india`
   - `nigeria`
4. Set:
   - **Post behavior** = `Dim` (or `Hide`)
   - **Auto action** = `None`
   - **Dry run** = `On`
5. Click **Save settings**.

Now open X and scroll your feed.

## Common modes

### Hide/Dim only (no blocking)
- Post behavior: `Hide` or `Dim`
- Auto action: `None`

### Auto-block by region (careful)
Start safe first:
- Auto action: `Block`
- Dry run: `On`
- Max actions/hour: `1` to `2`
- Delay: `3000ms`
- Sightings before action: `2`

When behavior looks correct, turn Dry run off.

## Quick stop buttons

From popup:
- Disable extension
- Set Auto action to `None`
- Pause for 30 minutes

## How matching works

The extension uses account About signals when available (not custom bio text):
- Account based in
- Connected via

Then it applies your include/exclude rules.

## Troubleshooting

- Nothing happens:
  - Make sure extension is enabled
  - Reload X tab
  - Check include rules are not empty
- Still not working:
  - Go to settings and click **Clear location cache**
  - Reload extension in `chrome://extensions`
- UI changed on X:
  - Auto mute/block may break if X changes menus

## License

MIT
