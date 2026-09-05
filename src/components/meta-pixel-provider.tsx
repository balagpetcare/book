'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageView } from '@/lib/meta-pixel';
import {
  ATTRIBUTION_COOKIE_NAME,
  ATTRIBUTION_MAX_AGE_SECONDS,
  mergeAttribution,
  parseAttributionSnapshot,
  serializeAttributionSnapshot,
  type AttributionSnapshot,
} from '@/lib/attribution';

interface FacebookPixelQueue {
  push: (args: unknown[]) => void;
  queue: unknown[];
  loaded: boolean;
  version: string;
  callMethod?: (context: FacebookPixelQueue, ...args: unknown[]) => void;
}

/**
 * MetaPixelProvider initializes Meta Pixel on the client side and handles
 * PageView tracking for both initial load and Next.js client-side navigation.
 *
 * - Script injection happens only once via this component
 * - PageView is tracked on mount and on route changes
 * - If NEXT_PUBLIC_META_PIXEL_ID is not set, the component gracefully disables
 */
export function MetaPixelProvider() {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

  // Initialize Meta Pixel script on mount
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

    // If no Pixel ID configured, skip initialization
    if (!pixelId) {
      return;
    }

    // Check if fbq is already initialized (prevent duplicate injection)
    if (typeof window !== 'undefined' && window.fbq) {
      return;
    }

    // Initialize Meta Pixel (official script)
    (() => {
      // Create the global fbq function
      const fbq = (...args: unknown[]) => {
        const fb = (window._fbq as unknown as FacebookPixelQueue) || {};
        if ('callMethod' in fb && typeof fb.callMethod === 'function') {
          fb.callMethod(fb as FacebookPixelQueue, ...args);
        } else {
          const queue = 'queue' in fb ? fb.queue : [];
          (queue as unknown[]).push(args);
        }
      };

      window.fbq = fbq as (action: string, ...args: unknown[]) => void;
      const fbqObj = window._fbq || {
        push: fbq,
        queue: [],
        loaded: true,
        version: '2.0',
      };
      window._fbq = fbqObj as unknown as FacebookPixelQueue;

      // Load the official Meta Pixel library script
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://connect.facebook.net/en_US/fbevents.js';

      script.onload = (): void => {
        // Initialize Pixel with ID
        if (window.fbq) {
          window.fbq('init', pixelId);
          // Track initial PageView on script load
          window.fbq('track', 'PageView');
        }
      };

      document.head.appendChild(script);
    })();
  }, [pixelId]);

  // Track PageView on route changes (Next.js client-side navigation)
  const pathname = usePathname();
  useEffect(() => {
    if (!pixelId) {
      return;
    }
    // Only track if fbq is already initialized
    if (typeof window !== 'undefined' && window.fbq) {
      trackPageView();
    }
  }, [pathname, pixelId]);

  return null;
}

declare global {
  interface Window {
    _fbq?: FacebookPixelQueue;
  }
}
