'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageView } from '@/lib/meta-pixel';

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
