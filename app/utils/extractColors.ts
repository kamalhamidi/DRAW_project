/**
 * Extracts dominant colors from an image and maps them to the theme palette.
 * Uses canvas pixel sampling with k-means-like clustering.
 */

interface ColorPalette {
  primary: string;
  primaryDark: string;
  accent1: string;
  accent2: string;
  accent2Text: string;
  highlight: string;
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function colorDistance(a: RGB, b: RGB): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

function getLuminance(r: number, g: number, b: number): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((c) =>
        Math.round(c)
          .toString(16)
          .padStart(2, "0")
      )
      .join("")
  );
}

/**
 * Simple k-means clustering on RGB pixels to find dominant colors.
 */
function kMeansClusters(pixels: RGB[], k: number, iterations = 10): RGB[] {
  if (pixels.length === 0) return [];

  // Initialize centroids using k-means++ style
  const centroids: RGB[] = [pixels[Math.floor(Math.random() * pixels.length)]];

  for (let i = 1; i < k; i++) {
    const distances = pixels.map((p) =>
      Math.min(...centroids.map((c) => colorDistance(p, c)))
    );
    const totalDist = distances.reduce((a, b) => a + b, 0);
    let rand = Math.random() * totalDist;
    for (let j = 0; j < pixels.length; j++) {
      rand -= distances[j];
      if (rand <= 0) {
        centroids.push(pixels[j]);
        break;
      }
    }
    if (centroids.length <= i) {
      centroids.push(pixels[Math.floor(Math.random() * pixels.length)]);
    }
  }

  // Run iterations
  for (let iter = 0; iter < iterations; iter++) {
    const clusters: RGB[][] = Array.from({ length: k }, () => []);

    // Assign pixels to nearest centroid
    for (const pixel of pixels) {
      let minDist = Infinity;
      let minIdx = 0;
      for (let i = 0; i < centroids.length; i++) {
        const d = colorDistance(pixel, centroids[i]);
        if (d < minDist) {
          minDist = d;
          minIdx = i;
        }
      }
      clusters[minIdx].push(pixel);
    }

    // Update centroids
    for (let i = 0; i < k; i++) {
      if (clusters[i].length === 0) continue;
      centroids[i] = {
        r: clusters[i].reduce((a, p) => a + p.r, 0) / clusters[i].length,
        g: clusters[i].reduce((a, p) => a + p.g, 0) / clusters[i].length,
        b: clusters[i].reduce((a, p) => a + p.b, 0) / clusters[i].length,
      };
    }
  }

  return centroids;
}

/**
 * Extracts a color palette from an image URL using canvas.
 * Returns a promise that resolves to the palette, or null on error.
 */
export function extractColorsFromImage(imageUrl: string): Promise<ColorPalette | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        // Sample at small resolution for performance
        const sampleSize = 80;
        canvas.width = sampleSize;
        canvas.height = sampleSize;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }

        ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
        const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
        const data = imageData.data;

        // Collect non-gray, non-extreme pixels
        const pixels: RGB[] = [];
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          // Skip transparent pixels
          if (a < 128) continue;

          // Skip near-black and near-white
          const lum = getLuminance(r, g, b);
          if (lum < 0.05 || lum > 0.95) continue;

          // Skip very gray pixels (low saturation)
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const saturation = max === 0 ? 0 : (max - min) / max;
          if (saturation < 0.1) continue;

          pixels.push({ r, g, b });
        }

        // If not enough colorful pixels, try with relaxed constraints
        if (pixels.length < 20) {
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const lum = getLuminance(r, g, b);
            if (lum >= 0.05 && lum <= 0.95) {
              pixels.push({ r, g, b });
            }
          }
        }

        if (pixels.length < 5) {
          resolve(null);
          return;
        }

        // Find 6 clusters
        const clusters = kMeansClusters(pixels, 6, 15);

        // Convert to HSL and sort by saturation * lightness (vibrance)
        const colorInfo = clusters.map((c) => {
          const [h, s, l] = rgbToHsl(c.r, c.g, c.b);
          return { rgb: c, h, s, l, vibrance: s * (1 - Math.abs(l - 50) / 50) };
        });

        // Sort by vibrance descending (most vibrant first)
        colorInfo.sort((a, b) => b.vibrance - a.vibrance);

        // Pick the most vibrant as primary
        const primaryColor = colorInfo[0];

        // Find a contrasting warm color for accent1 (shift hue by ~120-180)
        let accent1 = colorInfo.find(
          (c) =>
            c !== primaryColor &&
            Math.abs(c.h - primaryColor.h) > 60
        ) || colorInfo[1] || primaryColor;

        // Find another contrasting color for accent2
        let accent2 = colorInfo.find(
          (c) =>
            c !== primaryColor &&
            c !== accent1 &&
            Math.abs(c.h - primaryColor.h) > 40 &&
            Math.abs(c.h - accent1.h) > 40
        ) || colorInfo[2] || colorInfo[1] || primaryColor;

        // Generate the full palette
        const primaryHex = rgbToHex(primaryColor.rgb.r, primaryColor.rgb.g, primaryColor.rgb.b);
        const primaryDarkHex = hslToHex(
          primaryColor.h,
          Math.min(primaryColor.s * 1.1, 100),
          Math.max(primaryColor.l * 0.6, 10)
        );
        const accent1Hex = rgbToHex(accent1.rgb.r, accent1.rgb.g, accent1.rgb.b);

        // Make accent2 lighter/brighter for visibility
        const accent2Hex = hslToHex(
          accent2.h,
          Math.min(accent2.s * 1.2, 100),
          Math.min(Math.max(accent2.l, 45), 65)
        );

        const highlightHex = hslToHex(
          accent2.h,
          Math.min(accent2.s, 80),
          Math.min(accent2.l * 1.2, 60)
        );

        // Determine text color for accent2 background
        const accent2Lum = getLuminance(accent2.rgb.r, accent2.rgb.g, accent2.rgb.b);
        const accent2TextHex = accent2Lum > 0.5 ? primaryDarkHex : "#ffffff";

        resolve({
          primary: primaryHex,
          primaryDark: primaryDarkHex,
          accent1: accent1Hex,
          accent2: accent2Hex,
          accent2Text: accent2TextHex,
          highlight: highlightHex,
        });
      } catch {
        resolve(null);
      }
    };

    img.onerror = () => resolve(null);
    img.src = imageUrl;
  });
}

/**
 * Apply a color palette to the document root CSS variables.
 */
export function applyColorPalette(palette: ColorPalette): void {
  const root = document.documentElement;
  root.style.setProperty("--color-primary", palette.primary);
  root.style.setProperty("--color-primary-dark", palette.primaryDark);
  root.style.setProperty("--color-accent-1", palette.accent1);
  root.style.setProperty("--color-accent-2", palette.accent2);
  root.style.setProperty("--color-accent-2-text", palette.accent2Text);
  root.style.setProperty("--color-highlight", palette.highlight);
}

/**
 * Reset colors to the default theme.
 */
export function resetColorPalette(): void {
  const root = document.documentElement;
  root.style.removeProperty("--color-primary");
  root.style.removeProperty("--color-primary-dark");
  root.style.removeProperty("--color-accent-1");
  root.style.removeProperty("--color-accent-2");
  root.style.removeProperty("--color-accent-2-text");
  root.style.removeProperty("--color-highlight");
}

export type { ColorPalette };
