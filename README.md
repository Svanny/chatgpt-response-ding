# ChatGPT Response Ding

Chrome and Firefox extension that plays a short ding when ChatGPT finishes an assistant response, including long ChatGPT Pro / thinking-mode responses.

The repo ships both source and prebuilt unpacked extension folders for macOS and Windows.

## Use Prebuilt Extension

Prebuilt outputs are committed in this repo:

- `dist/chrome` for Chrome, Brave, Edge, and other Chromium browsers on macOS or Windows.
- `dist/firefox` for Firefox on macOS or Windows.
- `packages/chatgpt-response-ding-chrome.zip` for packaged Chromium distribution.
- `packages/chatgpt-response-ding-firefox.zip` for packaged Firefox distribution.

### Chrome, Brave, Or Edge On macOS

1. Open `chrome://extensions`, `brave://extensions`, or `edge://extensions`.
2. Enable Developer mode.
3. Choose Load unpacked.
4. Select the repo folder `dist/chrome`.
5. Refresh any open `https://chatgpt.com` tab.

### Chrome, Brave, Or Edge On Windows

1. Open `chrome://extensions`, `brave://extensions`, or `edge://extensions`.
2. Enable Developer mode.
3. Choose Load unpacked.
4. Select the repo folder `dist\chrome`.
5. Refresh any open `https://chatgpt.com` tab.

### Firefox On macOS

1. Open `about:debugging#/runtime/this-firefox`.
2. Choose Load Temporary Add-on.
3. Select `dist/firefox/manifest.json`.
4. Refresh any open `https://chatgpt.com` tab.

### Firefox On Windows

1. Open `about:debugging#/runtime/this-firefox`.
2. Choose Load Temporary Add-on.
3. Select `dist\firefox\manifest.json`.
4. Refresh any open `https://chatgpt.com` tab.

## Build

```sh
pnpm install
pnpm build
```

Outputs:

- `dist/chrome` for Chrome, Edge, and other Chromium browsers.
- `dist/firefox` for Firefox.

## Validate

```sh
pnpm typecheck
pnpm test
pnpm build
```

Use the extension popup on a ChatGPT page to enable/disable, change volume, toggle notification fallback, and play a test ding.
