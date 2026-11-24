/**
 * Generates and caches a 90-degree clockwise rotated version of a photo data URL.
 */
const rotatedCache = new Map<string, string>();

export async function getRotatedDataUrl(url: string): Promise<string> {
  if (rotatedCache.has(url)) {
    return rotatedCache.get(url)!;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalHeight;
      canvas.height = img.naturalWidth;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(url);
        return;
      }

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((90 * Math.PI) / 180);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      ctx.restore();

      const rotatedUrl = canvas.toDataURL('image/jpeg', 0.95);
      rotatedCache.set(url, rotatedUrl);
      resolve(rotatedUrl);
    };
    img.onerror = () => resolve(url);
    img.src = url;
  });
}
