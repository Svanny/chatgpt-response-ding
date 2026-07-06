import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const targets = process.argv[2] === "all" || !process.argv[2] ? ["chrome", "firefox"] : [process.argv[2]];
const validTargets = new Set(["chrome", "firefox"]);

const baseManifest = {
  manifest_version: 3,
  name: "ChatGPT Response Ding",
  description: "Play a ding when ChatGPT finishes responding.",
  version: "0.1.0",
  action: {
    default_title: "ChatGPT Ding",
    default_popup: "options.html",
  },
  background: {
    service_worker: "assets/background.js",
    type: "module",
  },
  content_scripts: [
    {
      matches: ["https://chatgpt.com/*", "https://chat.openai.com/*"],
      js: ["assets/content.js"],
      run_at: "document_idle",
    },
  ],
  host_permissions: ["https://chatgpt.com/*", "https://chat.openai.com/*"],
  permissions: ["storage", "notifications"],
  icons: {
    16: "icons/icon-16.png",
    32: "icons/icon-32.png",
    48: "icons/icon-48.png",
    128: "icons/icon-128.png",
  },
  web_accessible_resources: [
    {
      resources: ["audio/ding.wav"],
      matches: ["https://chatgpt.com/*", "https://chat.openai.com/*"],
    },
  ],
};

const firefoxPatch = {
  browser_specific_settings: {
    gecko: {
      id: "chatgpt-response-ding@example.local",
      strict_min_version: "109.0",
    },
  },
};

const makeDingWav = () => {
  const sampleRate = 44100;
  const durationSeconds = 0.42;
  const samples = Math.floor(sampleRate * durationSeconds);
  const dataSize = samples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples; i += 1) {
    const t = i / sampleRate;
    const envelope = Math.exp(-7 * t);
    const tone = Math.sin(2 * Math.PI * 880 * t) + 0.45 * Math.sin(2 * Math.PI * 1320 * t);
    const value = Math.max(-1, Math.min(1, tone * envelope * 0.45));
    buffer.writeInt16LE(Math.round(value * 32767), 44 + i * 2);
  }

  return buffer;
};

const writeAssets = async (outDir) => {
  await mkdir(resolve(outDir, "audio"), { recursive: true });
  await mkdir(resolve(outDir, "icons"), { recursive: true });
  await writeFile(resolve(outDir, "audio/ding.wav"), makeDingWav());

  await Promise.all(
    [16, 32, 48, 128].map((size) =>
      copyFile(resolve(root, `assets/icons/icon-${size}.png`), resolve(outDir, `icons/icon-${size}.png`)),
    ),
  );
};

const writeOptionsHtml = async (outDir) => {
  await writeFile(
    resolve(outDir, "options.html"),
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ChatGPT Ding</title>
    <script type="module" crossorigin src="/assets/options.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/options.css">
  </head>
  <body>
    <main class="app">
      <header>
        <h1>ChatGPT Ding</h1>
        <p>Sound when a response finishes.</p>
      </header>

      <label class="row">
        <span>Enabled</span>
        <input id="enabled" type="checkbox" />
      </label>

      <label class="row stack">
        <span>Volume</span>
        <input id="volume" type="range" min="0" max="1" step="0.05" />
      </label>

      <label class="row">
        <span>Notification fallback</span>
        <input id="notificationFallback" type="checkbox" />
      </label>

      <button id="testDing" type="button">Test Ding</button>
      <p id="status" role="status" aria-live="polite"></p>
    </main>
  </body>
</html>
`,
  );
};

const writeManifest = async (target, outDir) => {
  const manifest = target === "firefox" ? { ...baseManifest, ...firefoxPatch } : baseManifest;
  await writeFile(resolve(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
};

const buildTarget = async (target) => {
  if (!validTargets.has(target)) {
    throw new Error(`Unknown build target: ${target}`);
  }

  const outDir = resolve(root, "dist", target);
  await rm(outDir, { recursive: true, force: true });

  await build({
    root,
    configFile: false,
    build: {
      outDir,
      emptyOutDir: false,
      sourcemap: true,
      lib: {
        entry: resolve(root, "src/content/content.ts"),
        name: "ChatGptResponseDingContent",
        formats: ["iife"],
      },
      rollupOptions: {
        output: {
          entryFileNames: "assets/content.js",
        },
      },
    },
  });

  await build({
    root,
    configFile: false,
    build: {
      outDir,
      emptyOutDir: false,
      sourcemap: true,
      rollupOptions: {
        input: {
          background: resolve(root, "src/background/background.ts"),
        },
        output: {
          entryFileNames: "assets/[name].js",
          chunkFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name][extname]",
        },
      },
    },
  });

  await build({
    root,
    configFile: false,
    build: {
      outDir,
      emptyOutDir: false,
      sourcemap: true,
      rollupOptions: {
        input: {
          options: resolve(root, "src/options/options.ts"),
        },
        output: {
          entryFileNames: "assets/[name].js",
          chunkFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name][extname]",
        },
      },
    },
  });

  await writeOptionsHtml(outDir);
  await writeAssets(outDir);
  await writeManifest(target, outDir);
};

for (const target of targets) {
  await buildTarget(target);
}
