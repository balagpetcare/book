import type { MetaPixelFunction } from './meta-pixel';
import { flushQueuedMetaPixelCalls } from './meta-pixel';

export const META_PIXEL_SCRIPT_SRC = 'https://connect.facebook.net/en_US/fbevents.js';

/** Install the canonical Meta Pixel queue and schedule its script exactly once. */
export function bootstrapMetaPixel(pixelId: string): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !pixelId) return false;
  if (typeof window.fbq === 'function') {
    // Keep the legacy alias canonical even when another loader created fbq first.
    window._fbq = window.fbq;
    flushQueuedMetaPixelCalls();
    return false;
  }

  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue.push(args);
  } as MetaPixelFunction;

  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = '2.0';
  fbq.queue = [];
  window.fbq = fbq;
  window._fbq = fbq;

  if (!document.querySelector(`script[src="${META_PIXEL_SCRIPT_SRC}"]`)) {
    const script = document.createElement('script');
    script.async = true;
    script.src = META_PIXEL_SCRIPT_SRC;
    document.head.appendChild(script);
  }

  fbq('init', pixelId);
  fbq('track', 'PageView');
  flushQueuedMetaPixelCalls();
  return true;
}
