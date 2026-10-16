import type { FontBank } from "./glyphs.js";
type Manifest = { shardSize: number; available: number[] };
export type JsonLoader = (url: string) => Promise<unknown>;
const fetchJson: JsonLoader = async (url) => {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(
      "Could not load Chinese font outlines. Check the connection and retry.",
    );
  return response.json();
};
export class FontLoader {
  private manifest?: Promise<Manifest>;
  private chunks = new Map<number, Promise<void>>();
  readonly fallback: FontBank = {
    family: "NaturalInkCJK",
    unitsPerEm: 1000,
    cmap: {},
    alternates: {},
    glyphs: {},
    outlineStrengthScale: 0.14,
    textVariationScale: 0.25,
    fixedPitch: true,
  };
  constructor(
    readonly baseUrl: string,
    readonly load: JsonLoader = fetchJson,
  ) {}
  async ensure(text: string, primary: FontBank): Promise<FontBank> {
    const missing = [
      ...new Set(
        [...text].filter(
          (c) => !/[\n\r\t]/.test(c) && !primary.cmap[String(c.codePointAt(0))],
        ),
      ),
    ];
    if (!missing.length) return this.fallback;
    this.manifest ??= this.load(new URL("index.json", this.baseUrl).href)
      .then((value) => value as Manifest)
      .catch((error) => {
        this.manifest = undefined;
        throw error;
      });
    const manifest = await this.manifest,
      available = new Set(manifest.available);
    const buckets = [
      ...new Set(
        missing
          .map((c) => c.codePointAt(0)!)
          .filter((n) => available.has(n))
          .map((n) => Math.floor(n / manifest.shardSize)),
      ),
    ];
    // Limit concurrent asset requests for long mixed-language documents.
    let next = 0;
    const workers = Array.from(
      { length: Math.min(6, buckets.length) },
      async () => {
        while (next < buckets.length) {
          const bucket = buckets[next++];
          let task = this.chunks.get(bucket);
          if (!task) {
            task = this.load(
              new URL(`${bucket.toString(16)}.json`, this.baseUrl).href,
            )
              .then((value) => {
                const bank = value as FontBank;
                this.fallback.unitsPerEm = bank.unitsPerEm;
                Object.assign(this.fallback.cmap, bank.cmap);
                Object.assign(this.fallback.glyphs, bank.glyphs);
                Object.assign(this.fallback.alternates, bank.alternates);
              })
              .catch((error) => {
                this.chunks.delete(bucket);
                throw error;
              });
            this.chunks.set(bucket, task);
          }
          await task;
        }
      },
    );
    await Promise.all(workers);
    return this.fallback;
  }
}
