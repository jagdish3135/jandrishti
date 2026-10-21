import { dhashFromGray, HASH_H, HASH_W } from './dhash';
import { sceneDataUrl } from './scenes';

/** A stored photo value → something an <img> can show. */
export function photoSrc(photo: string | undefined) {
  if (!photo) return undefined;
  return photo.startsWith('seed:') ? sceneDataUrl(photo) : photo;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read this image.'));
    img.src = src;
  });
}

function draw(img: CanvasImageSource, w: number, h: number) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas is not available.');
  ctx.drawImage(img, 0, 0, w, h);
  return { canvas, ctx };
}

export async function hashPhoto(photo: string): Promise<string> {
  const img = await loadImage(photoSrc(photo)!);
  const { ctx } = draw(img, HASH_W, HASH_H);
  const { data } = ctx.getImageData(0, 0, HASH_W, HASH_H);
  const gray = new Array<number>(HASH_W * HASH_H);
  for (let i = 0; i < gray.length; i++) gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  return dhashFromGray(gray);
}

/** Shrink to fit `max` px and re-encode as JPEG so photos stay small in browser storage. */
export function toJpeg(img: CanvasImageSource & { width: number; height: number }, max = 800, w = img.width, h = img.height) {
  const k = Math.min(1, max / Math.max(w, h));
  const { canvas } = draw(img, Math.round(w * k), Math.round(h * k));
  return canvas.toDataURL('image/jpeg', 0.72);
}

export async function fileToJpeg(file: File, max = 800) {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
  if (file.size > 15 * 1024 * 1024) throw new Error('That image is over 15 MB.');
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    return toJpeg(img, max, img.naturalWidth, img.naturalHeight);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Current position, or null if the browser can't or won't share it. */
export function currentPosition(timeout = 8000): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout, maximumAge: 30_000 },
    );
  });
}
