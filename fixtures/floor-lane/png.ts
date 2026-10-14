// Just enough PNG decoding to read pixels back from browser screenshots (8-bit RGB or RGBA,
// non-interlaced, which is what Firefox, Chromium and WebKit produce), so the runner needs no npm package.
import { inflateSync } from 'node:zlib';

export interface Image {
  width: number;
  height: number;
  channels: number;
  data: Uint8Array;
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

export function decodePng(png: Buffer): Image {
  let width = 0;
  let height = 0;
  let header = '';
  const idat: Buffer[] = [];
  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('latin1', offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      header = `${data[8]}/${data[9]}/${data[12]}`; // bit depth / colour type / interlace
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    offset += 12 + length;
  }
  if (header !== '8/2/0' && header !== '8/6/0')
    throw new Error(`unsupported PNG (bit depth/colour type/interlace ${header})`);
  const channels = header === '8/6/0' ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = new Uint8Array(height * stride);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? (out[y * stride + x - channels] ?? 0) : 0;
      const up = y > 0 ? (out[(y - 1) * stride + x] ?? 0) : 0;
      const upLeft = x >= channels && y > 0 ? (out[(y - 1) * stride + x - channels] ?? 0) : 0;
      const predictors = [0, left, up, (left + up) >> 1, paeth(left, up, upLeft)];
      out[y * stride + x] =
        ((raw[y * (stride + 1) + 1 + x] ?? 0) + (predictors[filter ?? 0] ?? 0)) & 0xff;
    }
  }
  return { width, height, channels, data: out };
}

export function pixel(image: Image, x: number, y: number): [number, number, number] {
  const i = (Math.round(y) * image.width + Math.round(x)) * image.channels;
  return [image.data[i] ?? 0, image.data[i + 1] ?? 0, image.data[i + 2] ?? 0];
}
