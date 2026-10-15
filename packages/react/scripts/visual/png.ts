// The visual-regression lane's pixels (ARCHITECTURE.md §18.1): a small lossless PNG encoder and
// the compare. Decoding is fixtures/floor-lane/png.ts, which reads 8-bit RGB and RGBA, so the
// encoder writes 8-bit RGB (colour type 2) only: every shot sits on an opaque page, and a palette
// file could not be read back by that decoder. Size comes from the crop and the encoder: the best
// of the five PNG row filters per row (smallest sum of absolute bytes) and zlib level 9.
import { crc32, deflateSync } from 'node:zlib';
import { decodePng, type Image } from '../../../../fixtures/floor-lane/png.ts';

export { decodePng, type Image };

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function chunk(type: string, data: Buffer): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'latin1');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

/** Drops alpha (and any channel past the third): the lane's pages are opaque. */
export function toRgb(image: Image): Image {
  if (image.channels === 3) return image;
  const out = new Uint8Array(image.width * image.height * 3);
  for (let i = 0, j = 0; j < out.length; i += image.channels, j += 3) {
    out[j] = image.data[i] ?? 0;
    out[j + 1] = image.data[i + 1] ?? 0;
    out[j + 2] = image.data[i + 2] ?? 0;
  }
  return { width: image.width, height: image.height, channels: 3, data: out };
}

/** 8-bit RGB PNG, adaptive row filters, zlib level 9. The same pixels always give the same bytes. */
export function encodePng(source: Image): Buffer {
  const image = toRgb(source);
  const { width, height } = image;
  const stride = width * 3;
  const raw = Buffer.alloc(height * (stride + 1));
  const candidate = new Uint8Array(stride);
  const best = new Uint8Array(stride);
  for (let y = 0; y < height; y += 1) {
    let bestSum = Infinity;
    let bestFilter = 0;
    for (let filter = 0; filter < 5; filter += 1) {
      let sum = 0;
      for (let x = 0; x < stride; x += 1) {
        const i = y * stride + x;
        const value = image.data[i] ?? 0;
        const left = x >= 3 ? (image.data[i - 3] ?? 0) : 0;
        const up = y > 0 ? (image.data[i - stride] ?? 0) : 0;
        const upLeft = x >= 3 && y > 0 ? (image.data[i - stride - 3] ?? 0) : 0;
        const predicted =
          filter === 0
            ? 0
            : filter === 1
              ? left
              : filter === 2
                ? up
                : filter === 3
                  ? (left + up) >> 1
                  : paeth(left, up, upLeft);
        const byte = (value - predicted) & 0xff;
        candidate[x] = byte;
        sum += byte < 128 ? byte : 256 - byte;
      }
      if (sum < bestSum) {
        bestSum = sum;
        bestFilter = filter;
        best.set(candidate);
      }
    }
    raw[y * (stride + 1)] = bestFilter;
    raw.set(best, y * (stride + 1) + 1);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // colour type: RGB
  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9, memLevel: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** A solid RGB image (the placeholder photos ImageExample loads). */
export function solid(width: number, height: number, rgb: [number, number, number]): Image {
  const data = new Uint8Array(width * height * 3);
  for (let i = 0; i < data.length; i += 3) data.set(rgb, i);
  return { width, height, channels: 3, data };
}

// --- compare ------------------------------------------------------------------------------------
// A pixel differs when any channel moved by more than `tolerance`. Two opt-ins loosen that with
// pixelmatch's method (ISC, Mapbox), rewritten for this lane: a YIQ colour distance under a
// threshold also counts as equal, and a pixel that differs only because an edge moved by a
// sub-pixel (anti-aliasing, detected in both images) is counted apart and tolerated.

export interface CompareOptions {
  /** 0–255; the largest per-channel difference two pixels may show and still count as equal. */
  tolerance: number;
  /** 0–1; when set, a YIQ distance below it also counts as equal. pixelmatch's default is 0.1. */
  threshold?: number | undefined;
  /** Tolerate pixels both images show as anti-aliasing. */
  antialiasing: boolean;
}

export interface Comparison {
  /** Pixels that differ and are not tolerated anti-aliasing. */
  diff: number;
  /** Pixels that differ but both images show as anti-aliasing (tolerated with `antialiasing`). */
  antialiased: number;
  /** Faded baseline with differences in red and anti-aliased pixels in yellow; RGB. */
  image: Image;
}

const MAX_YIQ_DELTA = 35215;

function at(image: Image, x: number, y: number): [number, number, number] {
  const i = (y * image.width + x) * image.channels;
  return [image.data[i] ?? 0, image.data[i + 1] ?? 0, image.data[i + 2] ?? 0];
}

function brightness(r: number, g: number, b: number): number {
  return r * 0.29889531 + g * 0.58662247 + b * 0.11448223;
}

/** Squared YIQ distance; negative when the second pixel is darker (only the sign of `yOnly` is read). */
function delta(a: [number, number, number], b: [number, number, number], yOnly = false): number {
  const [r1, g1, b1] = a;
  const [r2, g2, b2] = b;
  if (r1 === r2 && g1 === g2 && b1 === b2) return 0;
  const y1 = brightness(r1, g1, b1);
  const y2 = brightness(r2, g2, b2);
  const dy = y1 - y2;
  if (yOnly) return dy;
  const i =
    r1 * 0.59597799 -
    g1 * 0.2741761 -
    b1 * 0.32180189 -
    (r2 * 0.59597799 - g2 * 0.2741761 - b2 * 0.32180189);
  const q =
    r1 * 0.21147017 -
    g1 * 0.52261711 +
    b1 * 0.31114694 -
    (r2 * 0.21147017 - g2 * 0.52261711 + b2 * 0.31114694);
  const d = 0.5053 * dy * dy + 0.299 * i * i + 0.1957 * q * q;
  return y1 > y2 ? -d : d;
}

function same(a: [number, number, number], b: [number, number, number]): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

/** Whether the pixel has at least three identical neighbours (so it sits inside a flat area). */
function hasManySiblings(image: Image, x1: number, y1: number): boolean {
  const own = at(image, x1, y1);
  let zeroes = x1 === 0 || x1 === image.width - 1 || y1 === 0 || y1 === image.height - 1 ? 1 : 0;
  for (let x = Math.max(x1 - 1, 0); x <= Math.min(x1 + 1, image.width - 1); x += 1) {
    for (let y = Math.max(y1 - 1, 0); y <= Math.min(y1 + 1, image.height - 1); y += 1) {
      if ((x !== x1 || y !== y1) && same(own, at(image, x, y))) zeroes += 1;
      if (zeroes > 2) return true;
    }
  }
  return false;
}

/** pixelmatch's anti-aliasing test: the pixel lies on a brightness gradient between two flat areas. */
function antialiased(image: Image, x1: number, y1: number, other: Image): boolean {
  const own = at(image, x1, y1);
  let zeroes = x1 === 0 || x1 === image.width - 1 || y1 === 0 || y1 === image.height - 1 ? 1 : 0;
  let min = 0;
  let max = 0;
  let minX = 0;
  let minY = 0;
  let maxX = 0;
  let maxY = 0;
  for (let x = Math.max(x1 - 1, 0); x <= Math.min(x1 + 1, image.width - 1); x += 1) {
    for (let y = Math.max(y1 - 1, 0); y <= Math.min(y1 + 1, image.height - 1); y += 1) {
      if (x === x1 && y === y1) continue;
      const d = delta(own, at(image, x, y), true);
      if (d === 0) {
        zeroes += 1;
        if (zeroes > 2) return false;
      } else if (d < min) {
        min = d;
        minX = x;
        minY = y;
      } else if (d > max) {
        max = d;
        maxX = x;
        maxY = y;
      }
    }
  }
  if (min === 0 || max === 0) return false;
  return (
    (hasManySiblings(image, minX, minY) && hasManySiblings(other, minX, minY)) ||
    (hasManySiblings(image, maxX, maxY) && hasManySiblings(other, maxX, maxY))
  );
}

export function compare(expected: Image, actual: Image, options: CompareOptions): Comparison {
  if (expected.width !== actual.width || expected.height !== actual.height) {
    throw new Error(
      `size differs: baseline ${expected.width}×${expected.height}, now ${actual.width}×${actual.height}`,
    );
  }
  const { width, height } = expected;
  const out = new Uint8Array(width * height * 3);
  const maxDelta =
    options.threshold === undefined
      ? undefined
      : MAX_YIQ_DELTA * options.threshold * options.threshold;
  let diff = 0;
  let aa = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const a = at(expected, x, y);
      const b = at(actual, x, y);
      const o = (y * width + x) * 3;
      const channel = Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
      const differs =
        channel > options.tolerance && (maxDelta === undefined || Math.abs(delta(a, b)) > maxDelta);
      if (differs) {
        const tolerated =
          options.antialiasing &&
          (antialiased(expected, x, y, actual) || antialiased(actual, x, y, expected));
        if (tolerated) {
          aa += 1;
          out.set([255, 210, 0], o);
        } else {
          diff += 1;
          out.set([230, 0, 40], o);
        }
      } else {
        // the baseline, faded to a light grey so the marks stand out
        const grey = 255 - Math.round((255 - brightness(a[0], a[1], a[2])) * 0.15);
        out.set([grey, grey, grey], o);
      }
    }
  }
  return { diff, antialiased: aa, image: { width, height, channels: 3, data: out } };
}
