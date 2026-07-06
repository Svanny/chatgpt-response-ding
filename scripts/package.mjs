import { mkdir } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ZipFile } from "yazl";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const targets = process.argv[2] === "all" || !process.argv[2] ? ["chrome", "firefox"] : [process.argv[2]];

const addDirectory = async (zip, baseDir, relativeDir = "") => {
  const { readdir } = await import("node:fs/promises");
  const entries = await readdir(resolve(baseDir, relativeDir), { withFileTypes: true });

  for (const entry of entries) {
    const relativePath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
    const absolutePath = resolve(baseDir, relativePath);

    if (entry.isDirectory()) {
      await addDirectory(zip, baseDir, relativePath);
    } else if (entry.isFile()) {
      zip.addFile(absolutePath, relativePath);
    }
  }
};

await mkdir(resolve(root, "packages"), { recursive: true });

for (const target of targets) {
  const zip = new ZipFile();
  const outPath = resolve(root, "packages", `chatgpt-response-ding-${target}.zip`);
  await addDirectory(zip, resolve(root, "dist", target));
  zip.end();
  await new Promise((resolvePromise, reject) => {
    zip.outputStream
      .pipe(createWriteStream(outPath))
      .on("close", resolvePromise)
      .on("error", reject);
  });
}
