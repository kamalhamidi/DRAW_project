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
 * Instead of using background colors directly, it finds colors that
 * will look great ON TOP of the background (high contrast, vibrant).
 */
export function extractColorsFromImage(imageUrl: string): Promise<ColorPalette | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
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

        // Step 1: Find the average/dominant background color
        let totalR = 0, totalG = 0, totalB = 0, count = 0;
        const allPixels: RGB[] = [];

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a < 128) continue;
          totalR += r; totalG += g; totalB += b; count++;
          allPixels.push({ r, g, b });
        }

        if (count < 10) { resolve(null); return; }

        const avgR = totalR / count;
        const avgG = totalG / count;
        const avgB = totalB / count;
        const bgLuminance = getLuminance(avgR, avgG, avgB);
        const [bgH, bgS, bgL] = rgbToHsl(avgR, avgG, avgB);
        const isDarkBg = bgLuminance < 0.5;

        // Step 2: Cluster all pixels
        const clusters = kMeansClusters(allPixels, 8, 15);

        // Step 3: Score each cluster color by how good it would look as a UI element on this background
        const scored = clusters.map((c) => {
          const [h, s, l] = rgbToHsl(c.r, c.g, c.b);
          const lum = getLuminance(c.r, c.g, c.b);

          // Contrast against background (higher = better visibility)
          const contrastRatio = Math.abs(lum - bgLuminance);

          // Saturation score (vibrant colors look better as accents)
          const satScore = s / 100;

          // Hue distance from background (avoid colors too similar to bg)
          const hueDist = Math.min(Math.abs(h - bgH), 360 - Math.abs(h - bgH)) / 180;

          // Penalize colors too close to bg luminance
          const lumDist = Math.abs(l - bgL) / 100;

          // Combined score: prioritize contrast + saturation + hue variety
          const score = (contrastRatio * 3) + (satScore * 2) + (hueDist * 1.5) + (lumDist * 1);

          return { rgb: c, h, s, l, lum, score, contrastRatio };
        });

        // Sort by score (best UI colors first)
        scored.sort((a, b) => b.score - a.score);

        // Step 4: Pick and enhance colors for the palette
        const pickColor = (candidates: typeof scored, excludeHues: number[] = []) => {
          for (const c of candidates) {
            const tooClose = excludeHues.some(
              eh => Math.min(Math.abs(c.h - eh), 360 - Math.abs(c.h - eh)) < 30
            );
            if (!tooClose && c.s > 15) return c;
          }
          return candidates[0];
        };

        const primary = scored[0];
        const accent1 = pickColor(scored.slice(1), [primary.h]);
        const accent2 = pickColor(scored.slice(1), [primary.h, accent1.h]);
        const highlight = pickColor(scored.slice(1), [primary.h, accent1.h, accent2.h]);

        // Step 5: Enhance colors to ensure they pop against the background
        const enhanceForBg = (h: number, s: number, l: number): string => {
          // Boost saturation
          let newS = Math.min(s * 1.4, 95);
          let newL = l;

          if (isDarkBg) {
            // On dark backgrounds, make colors brighter
            newL = Math.max(newL, 45);
            newL = Math.min(newL, 70);
          } else {
            // On light backgrounds, make colors deeper
            newL = Math.max(newL, 30);
            newL = Math.min(newL, 55);
          }

          // If color is still too close to bg luminance, push it further
          const enhancedLum = newL / 100;
          if (Math.abs(enhancedLum - bgLuminance) < 0.2) {
            newL = isDarkBg ? Math.min(newL + 20, 75) : Math.max(newL - 20, 25);
          }

          return hslToHex(h, newS, newL);
        };

        const primaryHex = enhanceForBg(primary.h, primary.s, primary.l);
        const primaryDarkHex = hslToHex(
          primary.h,
          Math.min(primary.s * 1.2, 95),
          isDarkBg ? Math.max(primary.l * 0.5, 12) : Math.max(primary.l * 0.7, 15)
        );
        const accent1Hex = enhanceForBg(accent1.h, accent1.s, accent1.l);
        const accent2Hex = enhanceForBg(accent2.h, accent2.s, accent2.l);
        const highlightHex = enhanceForBg(highlight.h, highlight.s, highlight.l);

        // Text color for accent2 background
        const accent2TextHex = isDarkBg ? primaryDarkHex : "#ffffff";

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
