// ─── Types ───────────────────────────────────────────────────────────────────

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number; // 0–360
  s: number; // 0–1
  l: number; // 0–1
}

export interface ColorPalette {
  primary: string;   // most vibrant dominant color → ShaderGradient color1
  secondary: string; // second dominant → ShaderGradient color2
  accent: string;    // deepest/darkest → ShaderGradient color3
}

export const DEFAULT_PALETTE: ColorPalette = {
  primary: "#606080",
  secondary: "#8d7dca",
  accent: "#212121",
};

// ─── Color Conversions ───────────────────────────────────────────────────────

export function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    default:
      h = ((r - g) / d + 4) / 6;
      break;
  }

  return { h: h * 360, s, l };
}

export function hslToRgb(h: number, s: number, l: number): RGB {
  h /= 360;

  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  };
}

export function rgbToHex({ r, g, b }: RGB): string {
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

// ─── Median Cut Quantization ─────────────────────────────────────────────────

interface ColorBucket {
  pixels: RGB[];
  average: RGB;
  population: number;
}

function getChannelRange(pixels: RGB[], channel: keyof RGB): number {
  let min = 255;
  let max = 0;
  for (const px of pixels) {
    if (px[channel] < min) min = px[channel];
    if (px[channel] > max) max = px[channel];
  }
  return max - min;
}

function getWidestChannel(pixels: RGB[]): keyof RGB {
  const rRange = getChannelRange(pixels, "r");
  const gRange = getChannelRange(pixels, "g");
  const bRange = getChannelRange(pixels, "b");

  if (rRange >= gRange && rRange >= bRange) return "r";
  if (gRange >= rRange && gRange >= bRange) return "g";
  return "b";
}

function averageColor(pixels: RGB[]): RGB {
  let rSum = 0,
    gSum = 0,
    bSum = 0;
  for (const px of pixels) {
    rSum += px.r;
    gSum += px.g;
    bSum += px.b;
  }
  const len = pixels.length;
  return {
    r: Math.round(rSum / len),
    g: Math.round(gSum / len),
    b: Math.round(bSum / len),
  };
}

function medianCut(pixels: RGB[], depth: number): ColorBucket[] {
  if (depth === 0 || pixels.length <= 1) {
    const avg = pixels.length > 0 ? averageColor(pixels) : { r: 0, g: 0, b: 0 };
    return [{ pixels, average: avg, population: pixels.length }];
  }

  const channel = getWidestChannel(pixels);
  pixels.sort((a, b) => a[channel] - b[channel]);

  const mid = Math.floor(pixels.length / 2);
  return [
    ...medianCut(pixels.slice(0, mid), depth - 1),
    ...medianCut(pixels.slice(mid), depth - 1),
  ];
}

// ─── Pixel Sampling & Filtering ──────────────────────────────────────────────

function samplePixels(imageData: ImageData): RGB[] {
  const { data, width, height } = imageData;
  const pixels: RGB[] = [];

  for (let i = 0; i < width * height * 4; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 128) continue; // skip transparent

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const hsl = rgbToHsl(r, g, b);

    // Filter out near-gray, near-black, near-white
    if (hsl.s < 0.05) continue;
    if (hsl.l < 0.03 || hsl.l > 0.95) continue;

    pixels.push({ r, g, b });
  }

  return pixels;
}

// ─── HSL Harmony Validation ──────────────────────────────────────────────────

function clampLightness(hsl: HSL, min: number, max: number): HSL {
  return { ...hsl, l: Math.max(min, Math.min(max, hsl.l)) };
}

function hueDiff(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return Math.min(diff, 360 - diff);
}

function validateHarmony(colors: RGB[]): RGB[] {
  const hslColors = colors.map((c) => rgbToHsl(c.r, c.g, c.b));

  // Check if all hues are within 30° — monochromatic
  const allClose =
    hueDiff(hslColors[0].h, hslColors[1].h) < 30 &&
    hueDiff(hslColors[0].h, hslColors[2].h) < 30 &&
    hueDiff(hslColors[1].h, hslColors[2].h) < 30;

  if (allClose) {
    // Generate analogous + split-complementary spread
    hslColors[1] = { ...hslColors[1], h: (hslColors[0].h + 40) % 360 };
    hslColors[2] = { ...hslColors[2], h: (hslColors[0].h + 300) % 360 }; // -60°
  }

  // Ensure contrast between pairs — ΔLightness > 0.15
  for (let i = 0; i < hslColors.length; i++) {
    for (let j = i + 1; j < hslColors.length; j++) {
      const dl = Math.abs(hslColors[i].l - hslColors[j].l);
      if (dl < 0.15) {
        // Push them apart
        if (hslColors[i].l > hslColors[j].l) {
          hslColors[i].l = Math.min(0.65, hslColors[i].l + 0.1);
          hslColors[j].l = Math.max(0.1, hslColors[j].l - 0.1);
        } else {
          hslColors[j].l = Math.min(0.65, hslColors[j].l + 0.1);
          hslColors[i].l = Math.max(0.1, hslColors[i].l - 0.1);
        }
      }
    }
  }

  // Dark UI adaptation — raised floors so dark album art still produces vibrant gradients:
  // color1 (primary) and color2 (secondary): lightness 0.35–0.70
  // color3 (accent/deepest): lightness 0.10–0.25
  hslColors[0] = clampLightness(hslColors[0], 0.35, 0.70);
  hslColors[1] = clampLightness(hslColors[1], 0.35, 0.70);
  hslColors[2] = clampLightness(hslColors[2], 0.10, 0.25);

  return hslColors.map((hsl) => hslToRgb(hsl.h, hsl.s, hsl.l));
}

// ─── Score & Select ──────────────────────────────────────────────────────────

function scoreBucket(bucket: ColorBucket): number {
  const hsl = rgbToHsl(bucket.average.r, bucket.average.g, bucket.average.b);
  // Favor: common colors × vibrant saturation × mid-range lightness
  return bucket.population * hsl.s * (1 - Math.abs(hsl.l - 0.5));
}

function selectTopColors(buckets: ColorBucket[]): RGB[] {
  const scored = buckets
    .filter((b) => b.population > 0)
    .sort((a, b) => scoreBucket(b) - scoreBucket(a));

  // Pick the top 3, falling back to duplicates if fewer than 3
  const result: RGB[] = [];
  for (let i = 0; i < 3; i++) {
    result.push(scored[Math.min(i, scored.length - 1)].average);
  }

  return result;
}

// ─── Main Extraction ─────────────────────────────────────────────────────────

const SAMPLE_SIZE = 64;
const MEDIAN_CUT_DEPTH = 3; // 2^3 = 8 buckets

// Cache to avoid re-extracting for the same image
const paletteCache = new Map<string, ColorPalette>();

export function extractPalette(imageUrl: string): Promise<ColorPalette> {
  // Return cached if available
  const cached = paletteCache.get(imageUrl);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = SAMPLE_SIZE;
        canvas.height = SAMPLE_SIZE;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(DEFAULT_PALETTE);
          return;
        }

        ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
        const imageData = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
        const pixels = samplePixels(imageData);

        // Not enough valid pixels — fall back
        if (pixels.length < 10) {
          resolve(DEFAULT_PALETTE);
          return;
        }

        const buckets = medianCut(pixels, MEDIAN_CUT_DEPTH);
        const topColors = selectTopColors(buckets);
        const harmonized = validateHarmony(topColors);

        const palette: ColorPalette = {
          primary: rgbToHex(harmonized[0]),
          secondary: rgbToHex(harmonized[1]),
          accent: rgbToHex(harmonized[2]),
        };

        paletteCache.set(imageUrl, palette);
        resolve(palette);
      } catch {
        // CORS or other canvas security error
        resolve(DEFAULT_PALETTE);
      }
    };

    img.onerror = () => {
      resolve(DEFAULT_PALETTE);
    };

    img.src = imageUrl;
  });
}

// ─── Lerp Utility ────────────────────────────────────────────────────────────

/**
 * Linearly interpolate between two hex colors.
 * `t` ranges from 0 (returns `from`) to 1 (returns `to`).
 */
export function lerpColor(from: string, to: string, t: number): string {
  const a = hexToRgb(from);
  const b = hexToRgb(to);

  return rgbToHex({
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  });
}
