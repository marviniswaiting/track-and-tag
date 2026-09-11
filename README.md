# Track&Tag

Track&Tag is an offline-first warehouse station for identifying an item, capturing a locked weight, recording the handling event, and printing a compact Bluetooth thermal label. It is designed for one-handed use on Android phones, but the manual workflow also works on current desktop browsers.

All operational data stays in the browser on the device. There is no account, backend, analytics service, or network sync.

## Operator workflow

1. Scan or enter a location (`LOC…`).
2. Scan or enter an item ID (`ITEM…`).
3. Pair a supported BLE scale or enter a weight manually.
4. Lock the weight. A weight of `0` is valid.
5. Save the record, or print a label after pairing a supported printer. A successful new-entry print also saves the handling record; reprints do not create duplicate records.
6. Search, reprint, delete, or export entries from **History**.

USB/Bluetooth wedge scanners can type a value followed by Enter. Configured command labels can also trigger Save or Print. The camera reader supports QR Code, Data Matrix, and the other formats exposed by ZXing's multi-format reader.

## What changed in version 3

- Migrated the 1,480-line browser-transpiled prototype to modular React and strict TypeScript.
- Removed runtime CDN scripts and Babel; production dependencies are pinned and bundled.
- Added versioned, validated persistence with automatic migration from the legacy `records`, `printHistory`, `settings`, and `theme` keys.
- Separated scan rules, storage, exports, label rendering, scale decoding, and printer transport into testable modules.
- Added defensive BLE packet parsing and capability-based printer writes without automatic reconnect or keep-alive loops.
- Added validated settings/backup import, full JSON backup, CSV formula-injection protection, search, explicit duplicate handling, and storage-error reporting.
- Rebuilt the interface for accessible touch operation, responsive layouts, safe areas, visible focus, high contrast, reduced motion, and clear unsupported/error/empty states.
- Added generated Workbox service worker, update notification, CI, browser tests, and GitHub Pages deployment.

## Browser and hardware support

- **Manual records:** current Chrome, Edge, Firefox, and Safari.
- **Camera scanning:** requires HTTPS/localhost and camera permission.
- **Web Bluetooth:** supported primarily by Chromium browsers on Android and desktop platforms where Web Bluetooth is enabled. It is not generally available in Firefox or iOS Safari.
- **Scale:** expects the Bluetooth SIG Weight Scale service `0x181D` and Weight Measurement characteristic `0x2A9D`.
- **Printer:** expects service `0000ff00-0000-1000-8000-00805f9b34fb`, characteristic `0000ff02-0000-1000-8000-00805f9b34fb`, and the command profile retained from the original printer integration.

Bluetooth devices vary despite cheerful claims of compatibility on packaging. Validate the intended scale, printer, label stock, raster orientation, chunk size, and cut/feed commands on physical hardware before operational rollout. Automated tests cover protocol parsing and write selection; they cannot establish radio or printer compatibility.

Connections are deliberately session-only. Browsers require a user gesture for device selection, and the app does not run automatic reconnect or keep-alive loops.

## Privacy and durability

Records, print history, settings, and theme are stored locally in a versioned `localStorage` document. Legacy data is migrated in place on first launch. If persistence fails (for example, private-mode restrictions or quota exhaustion), the app keeps the current in-memory state and displays a warning.

Use **Settings → Full JSON backup** regularly. Restoring a backup validates its version, records, and settings before replacing local state. CSV exports include a UTF-8 BOM, RFC 4180 quoting, and protection against spreadsheet formula execution.

Clearing browser site data removes Track&Tag data. Installing the PWA does not create a cloud backup.

## Settings schema

A settings export is a JSON object with:

- `decimalPlaces`: integer from 0 through 6.
- `locationRegex`: JavaScript regular expression for location scans.
- `itemRegex`: JavaScript regular expression for item scans.
- `printCommandRegex`: expression matching a print command label.
- `saveCommandRegex`: expression matching a save command label.
- `template`: non-empty array of label elements.

Each label element requires `type`, `content`, `x`, and `y`:

- `type`: `text`, `barcode`, `qrcode`, or `datamatrix`.
- `content`: text with optional `{location}`, `{item}`, and `{weight}` placeholders.
- `x`, `y`: element centre in the 96 × 240 pixel label canvas.
- Optional: `rot`, `size`, `scale`, `padding`, `height`, `width`, `format`, and `showText`.

Imports are rejected if required fields, regular expressions, coordinates, or template element types are invalid.

## Development

Prerequisites: Node.js 22 or newer and npm.

```bash
npm ci
npm run dev
```

The development and preview servers use the GitHub Pages-compatible `/track-and-tag/` base path, matching production. Open the URL Vite prints, then append `/track-and-tag/` if the terminal shows only the origin.

## Verification

```bash
npm run lint
npm run typecheck
npm run test
npm run coverage
npm run build
npx playwright install chromium
npm run e2e
```

`npm run check` runs linting, type checking, unit tests, and the production build. Playwright exercises the manual-entry and history workflow at phone and desktop viewport sizes without requiring Bluetooth hardware.

## Deployment

- Pull requests and pushes to `main` run `.github/workflows/quality.yml`.
- Pushes to `main` build `dist/` and deploy it through GitHub Pages using `.github/workflows/deploy-pages.yml`.
- The Vite PWA plugin generates a hashed precache and service worker. Updates wait for operator confirmation rather than forcibly reloading an active handling entry.

GitHub Pages must allow Actions deployments and the `github-pages` environment. The deployed URL is `https://dev4236.github.io/track-and-tag/`.
