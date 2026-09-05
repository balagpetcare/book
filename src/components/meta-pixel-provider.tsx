'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageView } from '@/lib/meta-pixel';
import { bootstrapMetaPixel } from '@/lib/meta-pixel-bootstrap';
import {
  ATTRIBUTION_COOKIE_NAME,
  ATTRIBUTION_MAX_AGE_SECONDS,
  mergeAttribution,
  parseAttributionSnapshot,
  serializeAttributionSnapshot,
  type AttributionSnapshot,
} from '@/lib/attribution';

/** Initializes the single browser Pixel queue and tracks one PageView per route. */
export function MetaPixelProvider() {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const initialPageViewHandled = useRef(false);
  const previousPathname = useRef<string | null>(null);

  useEffect(() => {
    const current = parseAttributionSnapshot(document.cookie.split('; ').find((cookie) => cookie.startsWith(`${ATTRIBUTION_COOKIE_NAME}=`))?.split('=').slice(1).join('='));
    const params = new URLSearchParams(window.location.search);
    const incoming: AttributionSnapshot = {};
    for (const key of ['fbclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const) {
      const value = params.get(key);
      if (value) incoming[key] = value;
    }
    const fbp = document.cookie.split('; ').find((cookie) => cookie.startsWith('_fbp='))?.split('=').slice(1).join('=');
    const fbc = document.cookie.split('; ').find((cookie) => cookie.startsWith('_fbc='))?.split('=').slice(1).join('=');
    if (fbp) incoming.fbp = fbp;
    if (fbc) incoming.fbc = fbc;
    const snapshot = mergeAttribution(current, incoming);
    if (Object.keys(snapshot).length > 0) {
      document.cookie = `${ATTRIBUTION_COOKIE_NAME}=${encodeURIComponent(serializeAttributionSnapshot(snapshot))}; Max-Age=${ATTRIBUTION_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`;
    }

    if (!pixelId || initialPageViewHandled.current) return;
    bootstrapMetaPixel(pixelId);
    // Existing callable fbq belongs to the sole loader and has already handled initial setup.
    initialPageViewHandled.current = true;
  }, [pixelId]);

  const pathname = usePathname();
  useEffect(() => {
    if (previousPathname.current === null) {
      previousPathname.current = pathname;
      return;
    }
    if (!pixelId || pathname === previousPathname.current) return;
    previousPathname.current = pathname;
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') trackPageView();
  }, [pathname, pixelId]);

  return null;
}
