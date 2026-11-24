/**
 * Re-encodes any uploaded or camera-captured image onto an offscreen HTMLCanvasElement.
 * Drawing to canvas strips all EXIF metadata (GPS location, device serial, timestamps)
 * and keeps resolution <= 960px so 2 GB RAM phones never OOM.
 */
export async function stripExifAndCompressImage(
  source: File | Blob | HTMLVideoElement,
  maxDimension = 960,
  quality = 0.82
): Promise<{ dataUrl: string; base64: string; mimeType: 'image/jpeg' }> {
  let width = 0;
  let height = 0;
  let drawable: CanvasImageSource;
  let objectUrl: string | null = null;

  if (source instanceof HTMLVideoElement) {
    width = source.videoWidth || 640;
    height = source.videoHeight || 480;
    drawable = source;
  } else {
    objectUrl = URL.createObjectURL(source);
    const img = await loadImage(objectUrl);
    width = img.naturalWidth || img.width;
    height = img.naturalHeight || img.height;
    drawable = img;
  }

  try {
    const scale = Math.min(1, maxDimension / Math.max(width, height, 1));
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context unavailable for EXIF stripping.');
    }
    ctx.drawImage(drawable, 0, 0, targetW, targetH);

    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    const base64 = dataUrl.split(',')[1] ?? '';
    return { dataUrl, base64, mimeType: 'image/jpeg' };
  } finally {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to decode image for local processing.'));
    img.src = src;
  });
}
