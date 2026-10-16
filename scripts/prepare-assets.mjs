import { readFile, writeFile, mkdir, copyFile, cp } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = new URL("../", import.meta.url);
const output = new URL("public/assets/", root);
await mkdir(new URL("cjk/", output), { recursive: true });
const manifest = JSON.parse(
  await readFile(new URL("font-data/manifest.json", root), "utf8"),
);
if (manifest.version !== 1 || !manifest.bundles?.length)
  throw new Error("Unsupported or empty font-data manifest.");
for (const bundle of manifest.bundles) {
  if (!/^outlines-\d+\.json\.gz$/.test(bundle.file))
    throw new Error("Invalid font archive name.");
  const archive = await readFile(new URL(`font-data/${bundle.file}`, root));
  if (createHash("sha256").update(archive).digest("hex") !== bundle.sha256)
    throw new Error(
      `Font archive checksum mismatch: ${bundle.file}. Restore it from Git.`,
    );
  const files = JSON.parse(gunzipSync(archive).toString("utf8"));
  if (
    JSON.stringify(Object.keys(files).sort()) !==
    JSON.stringify([...bundle.files].sort())
  )
    throw new Error(`Font archive file list mismatch: ${bundle.file}`);
  for (const [path, contents] of Object.entries(files)) {
    if (
      !/^(caveat-glyphs\.json|cjk\/[a-z0-9]+\.json)$/.test(path) ||
      typeof contents !== "string"
    )
      throw new Error(`Invalid font data path: ${path}`);
    const destination = new URL(path, output);
    await mkdir(dirname(fileURLToPath(destination)), { recursive: true });
    await writeFile(destination, contents);
  }
}
for (const [source, target] of [
  ["licenses/Caveat-OFL.txt", "OFL.txt"],
  ["licenses/WenKai-OFL.txt", "cjk/OFL.txt"],
  ["NOTICE.md", "NOTICE.md"],
  ["THIRD_PARTY.md", "THIRD_PARTY.md"],
])
  await copyFile(new URL(source, root), new URL(target, output));
const pdf = new URL("node_modules/pdfjs-dist/", root);
await mkdir(new URL("pdfjs/", output), { recursive: true });
for (const directory of ["cmaps", "standard_fonts"])
  await cp(new URL(directory, pdf), new URL(`pdfjs/${directory}`, output), {
    recursive: true,
  });
await copyFile(new URL("LICENSE", pdf), new URL("pdfjs/LICENSE", output));
console.log(
  "Prepared bundled handwriting outlines, licenses and PDF.js assets (Node only).",
);
