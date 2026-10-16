// CPython's integer-seeded MT19937, including rejection sampling for randrange.
// Streams use the same SHA-256 key encoding as natural_ink.randomness.rng_for.
export class Random {
  private state = new Uint32Array(624);
  private index = 624;
  constructor(seed: bigint) {
    const keys: number[] = [];
    do {
      keys.push(Number(seed & 0xffffffffn));
      seed >>= 32n;
    } while (seed);
    this.state[0] = 19650218;
    for (let i = 1; i < 624; i++)
      this.state[i] =
        (Math.imul(1812433253, this.state[i - 1] ^ (this.state[i - 1] >>> 30)) +
          i) >>>
        0;
    let i = 1,
      j = 0;
    for (let k = Math.max(624, keys.length); k; k--) {
      this.state[i] =
        ((this.state[i] ^
          Math.imul(this.state[i - 1] ^ (this.state[i - 1] >>> 30), 1664525)) +
          keys[j] +
          j) >>>
        0;
      if (++i >= 624) {
        this.state[0] = this.state[623];
        i = 1;
      }
      if (++j >= keys.length) j = 0;
    }
    for (let k = 623; k; k--) {
      this.state[i] =
        ((this.state[i] ^
          Math.imul(
            this.state[i - 1] ^ (this.state[i - 1] >>> 30),
            1566083941,
          )) -
          i) >>>
        0;
      if (++i >= 624) {
        this.state[0] = this.state[623];
        i = 1;
      }
    }
    this.state[0] = 0x80000000;
  }
  private uint32(): number {
    if (this.index >= 624) {
      for (let i = 0; i < 624; i++) {
        const y =
          ((this.state[i] & 0x80000000) |
            (this.state[(i + 1) % 624] & 0x7fffffff)) >>>
          0;
        this.state[i] =
          (this.state[(i + 397) % 624] ^
            (y >>> 1) ^
            (y & 1 ? 0x9908b0df : 0)) >>>
          0;
      }
      this.index = 0;
    }
    let y = this.state[this.index++];
    y ^= y >>> 11;
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= y >>> 18;
    return y >>> 0;
  }
  random(): number {
    return (
      ((this.uint32() >>> 5) * 67108864 + (this.uint32() >>> 6)) /
      9007199254740992
    );
  }
  uniform(a: number, b: number): number {
    return a + (b - a) * this.random();
  }
  range(n: number): number {
    const bits = Math.floor(Math.log2(n)) + 1;
    let result: number;
    do {
      result = this.uint32() >>> (32 - bits);
    } while (result >= n);
    return result;
  }
  sign(): number {
    return this.range(2) ? 1 : -1;
  }
}

export async function rngFor(
  seed: number,
  ...keys: (string | number)[]
): Promise<Random> {
  const data = new TextEncoder().encode(JSON.stringify([seed, ...keys]));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  let value = 0n;
  for (const byte of digest.slice(0, 16)) value = (value << 8n) | BigInt(byte);
  return new Random(value);
}
