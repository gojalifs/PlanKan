/**
 * Compress an image file to max ~1MB using Canvas API, optionally rotated.
 * Returns a new File object (JPEG, quality-adjusted).
 */
export async function compressImage(
  file: File,
  maxBytes = 1 * 1024 * 1024,
  rotation: 0 | 90 | 180 | 270 = 0
): Promise<File> {
  const needsRotate = rotation % 360 !== 0;

  // Skip re-encoding entirely if it already fits and needs no rotation
  if (!needsRotate && file.size <= maxBytes) {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const sw = bitmap.width;
  const sh = bitmap.height;

  // Scale down large images (helps compression)
  let w = sw;
  let h = sh;
  const maxDim = 2048;
  if (Math.max(w, h) > maxDim) {
    const ratio = maxDim / Math.max(w, h);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const rotated = rotation % 180 !== 0;
  canvas.width = rotated ? h : w;
  canvas.height = rotated ? w : h;

  // Draw centered, scaled to the target size, then rotate
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(w / sw, h / sh);
  ctx.drawImage(bitmap, -sw / 2, -sh / 2);
  bitmap.close();

  // Binary search for quality that fits under maxBytes
  let lo = 0.1;
  let hi = 0.92;
  let bestBlob: Blob | null = null;

  for (let i = 0; i < 6; i++) {
    const mid = (lo + hi) / 2;
    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/jpeg", mid)
    );
    bestBlob = blob;
    if (blob.size > maxBytes) {
      hi = mid;
    } else {
      lo = mid;
    }
  }

  // Final pass with lowest quality found
  const finalBlob = bestBlob!;
  const ext = ".jpg";
  return new File([finalBlob], file.name.replace(/\.[^.]+$/, ext), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}