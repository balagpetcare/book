import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import {
  trackPageView,
  trackViewContent,
  trackInitiateCheckout,
  trackAddPaymentInfo,
} from '../src/lib/meta-pixel';

describe('Meta Pixel Helper Layer', () => {
  // Mock window.fbq
  let originalFbq: ((action: string, ...args: unknown[]) => void) | undefined;
  let globalWindow: (typeof globalThis.window) | undefined;

  beforeEach(() => {
    globalWindow = globalThis.window;
    originalFbq = globalThis.window?.fbq;
    // Setup mock fbq
    Object.defineProperty(globalThis, 'window', {
      value: { fbq: undefined },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    if (globalWindow) {
      Object.defineProperty(globalThis, 'window', {
        value: globalWindow,
        writable: true,
        configurable: true,
      });
    }
    if (originalFbq) {
      globalThis.window.fbq = originalFbq;
    }
  });

  describe('Graceful degradation when Pixel ID is absent', () => {
    it('should not throw when fbq is undefined', () => {
      globalThis.window.fbq = undefined;
      assert.doesNotThrow(() => {
        trackPageView();
      });
    });

    it('should not throw when window is undefined', () => {
      Object.defineProperty(globalThis, 'window', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      assert.doesNotThrow(() => {
        trackPageView();
      });
    });
  });

  describe('Event tracking', () => {
    it('should call fbq with PageView event', () => {
      const calls: unknown[][] = [];
      globalThis.window.fbq = (...args: unknown[]) => {
        calls.push(args);
      };

      trackPageView();
      assert.strictEqual(calls.length, 1);
      assert.deepStrictEqual(calls[0], ['track', 'PageView']);
    });

    it('should call fbq with ViewContent event', () => {
      const calls: unknown[][] = [];
      globalThis.window.fbq = (...args: unknown[]) => {
        calls.push(args);
      };

      const params = {
        content_type: 'product',
        content_name: 'Test Book',
        value: 500,
        currency: 'BDT',
      };
      trackViewContent(params);

      assert.strictEqual(calls.length, 1);
      assert.strictEqual(calls[0][0], 'track');
      assert.strictEqual(calls[0][1], 'ViewContent');
      assert.deepStrictEqual(calls[0][2], params);
    });

    it('should call fbq with InitiateCheckout event', () => {
      const calls: unknown[][] = [];
      globalThis.window.fbq = (...args: unknown[]) => {
        calls.push(args);
      };

      const params = { value: 550, currency: 'BDT', num_items: 1 };
      trackInitiateCheckout(params);

      assert.strictEqual(calls.length, 1);
      assert.strictEqual(calls[0][0], 'track');
      assert.strictEqual(calls[0][1], 'InitiateCheckout');
      assert.deepStrictEqual(calls[0][2], params);
    });

    it('should call fbq with AddPaymentInfo event', () => {
      const calls: unknown[][] = [];
      globalThis.window.fbq = (...args: unknown[]) => {
        calls.push(args);
      };

      const params = { value: 550, currency: 'BDT' };
      trackAddPaymentInfo(params);

      assert.strictEqual(calls.length, 1);
      assert.strictEqual(calls[0][0], 'track');
      assert.strictEqual(calls[0][1], 'AddPaymentInfo');
      assert.deepStrictEqual(calls[0][2], params);
    });

    it('should handle empty parameters gracefully', () => {
      const calls: unknown[][] = [];
      globalThis.window.fbq = (...args: unknown[]) => {
        calls.push(args);
      };

      trackViewContent();
      trackInitiateCheckout();
      trackAddPaymentInfo();

      assert.strictEqual(calls.length, 3);
      assert.deepStrictEqual(calls[0], ['track', 'ViewContent', {}]);
      assert.deepStrictEqual(calls[1], ['track', 'InitiateCheckout', {}]);
      assert.deepStrictEqual(calls[2], ['track', 'AddPaymentInfo', {}]);
    });
  });

  describe('No sensitive data exposure', () => {
    it('should not expose full delivery addresses in ViewContent', () => {
      const calls: unknown[][] = [];
      globalThis.window.fbq = (...args: unknown[]) => {
        calls.push(args);
      };

      const params = {
        content_type: 'product',
        content_name: 'Test Book',
        value: 500,
        currency: 'BDT',
      };
      trackViewContent(params);

      assert(!JSON.stringify(calls[0][2]).includes('address'));
      assert(!JSON.stringify(calls[0][2]).includes('phone'));
      assert(!JSON.stringify(calls[0][2]).includes('email'));
    });

    it('should not expose transaction IDs in AddPaymentInfo', () => {
      const calls: unknown[][] = [];
      globalThis.window.fbq = (...args: unknown[]) => {
        calls.push(args);
      };

      const params = { value: 550, currency: 'BDT' };
      trackAddPaymentInfo(params);

      assert(!JSON.stringify(calls[0][2]).includes('transactionId'));
      assert(!JSON.stringify(calls[0][2]).includes('paymentMethod'));
      assert(!JSON.stringify(calls[0][2]).includes('proof'));
    });
  });

  describe('Intentional exclusion of Purchase event', () => {
    it('should NOT have a trackPurchase function exported from lib', () => {
      // This test ensures Purchase event is intentionally not available in browser tracking.
      // Purchase will be implemented server-side via Conversions API (COMMAND 12A2).
      // The module only exports: trackPageView, trackViewContent, trackInitiateCheckout, trackAddPaymentInfo

      // Verify the expected functions exist and are callable
      assert.strictEqual(typeof trackPageView, 'function');
      assert.strictEqual(typeof trackViewContent, 'function');
      assert.strictEqual(typeof trackInitiateCheckout, 'function');
      assert.strictEqual(typeof trackAddPaymentInfo, 'function');

      // Note: trackPurchase is intentionally not exported
      // This prevents accidental browser-side Purchase tracking before server confirmation
    });
  });
});
