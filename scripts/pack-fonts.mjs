// Maintenance utility: package the prepared outline banks without external tools.
// Normal builds use the committed archives and never run this script.
import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { createHash } from "node:crypto";
const root = new URL("../", import.meta.url);
const source = new URL("public/assets/", root);
const output = new URL("font-data/", root);
await mkdir(output, { recursive: true });
const cjk = (await readdir(new URL("cjk/", source)))
  .filter((name) => name.endsWith(".json"))
  .sort();
const groups = [["caveat-glyphs.json"]];
for (let i = 0; i < cjk.length; i += 128)
  groups.push(cjk.slice(i, i + 128).map((name) => `cjk/${name}`));
const manifest = { version: 1, bundles: [] };
for (const [index, paths] of groups.entries()) {
  const entries = {};
  for (const path of paths)
    entries[path] = await readFile(new URL(path, source), "utf8");
  const data = gzipSync(JSON.stringify(entries), { level: 9 });
  const file = `outlines-${String(index).padStart(2, "0")}.json.gz`;
  await writeFile(new URL(file, output), data);
  manifest.bundles.push({
    file,
    sha256: createHash("sha256").update(data).digest("hex"),
    files: paths,
  });
}
await writeFile(
  new URL("manifest.json", output),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  `Packed ${groups.flat().length} outline files into ${groups.length} archives.`,
);
