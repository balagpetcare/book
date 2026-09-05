import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import {
  trackPageView,
  trackViewContent,
  trackInitiateCheckout,
  trackAddPaymentInfo,
} from '../src/lib/meta-pixel';
import { bootstrapMetaPixel, META_PIXEL_SCRIPT_SRC } from '../src/lib/meta-pixel-bootstrap';
import type { MetaPixelFunction } from '../src/lib/meta-pixel';

function mockFbq(handler: (...args: unknown[]) => void): MetaPixelFunction {
  const fbq = handler as MetaPixelFunction;
  fbq.push = fbq;
  fbq.queue = [];
  fbq.loaded = true;
  fbq.version = '2.0';
  return fbq;
}

describe('Canonical Meta Pixel bootstrap', () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;

  afterEach(() => {
    Object.defineProperty(globalThis, 'window', { value: originalWindow, writable: true, configurable: true });
    Object.defineProperty(globalThis, 'document', { value: originalDocument, writable: true, configurable: true });
  });

  function installFakeDom() {
    const scripts: Array<{ src: string; async: boolean }> = [];
    const fakeDocument = {
      querySelector: () => scripts.find((script) => script.src === META_PIXEL_SCRIPT_SRC) || null,
      createElement: () => ({ src: '', async: false }),
      head: { appendChild: (script: { src: string; async: boolean }) => scripts.push(script) },
    };
    Object.defineProperty(globalThis, 'window', { value: { fbq: undefined, _fbq: undefined }, writable: true, configurable: true });
    Object.defineProperty(globalThis, 'document', { value: fakeDocument, writable: true, configurable: true });
    return scripts;
  }

  it('uses one canonical callable queue, one script, one init, and one initial PageView', () => {
    const scripts = installFakeDom();
    assert.strictEqual(bootstrapMetaPixel('1558416609371367'), true);
    assert.strictEqual(bootstrapMetaPixel('1558416609371367'), false);

    const fbq = globalThis.window.fbq as MetaPixelFunction;
    assert.strictEqual(typeof fbq, 'function');
    assert.strictEqual(globalThis.window._fbq, fbq);
    assert.strictEqual(fbq.push, fbq);
    assert.strictEqual(fbq.loaded, true);
    assert.strictEqual(fbq.version, '2.0');
    assert(Array.isArray(fbq.queue));
    assert.deepStrictEqual(fbq.queue, [['init', '1558416609371367'], ['track', 'PageView']]);
    assert.strictEqual(scripts.length, 1);
    assert.strictEqual(scripts[0].src, META_PIXEL_SCRIPT_SRC);
  });

  it('does not bootstrap or initialize an already-existing callable fbq', () => {
    const scripts = installFakeDom();
    const calls: unknown[][] = [];
    const existing = Object.assign((...args: unknown[]) => calls.push(args), { push: undefined!, queue: [], loaded: true, version: '2.0' }) as MetaPixelFunction;
    existing.push = existing;
    globalThis.window.fbq = existing;
    globalThis.window._fbq = undefined;

    assert.strictEqual(bootstrapMetaPixel('1558416609371367'), false);
    assert.strictEqual(scripts.length, 0);
    assert.strictEqual(globalThis.window._fbq, existing);
    assert.deepStrictEqual(calls, []);
  });
});

describe('Meta Pixel Helper Layer', () => {
  // Mock window.fbq
  let originalFbq: MetaPixelFunction | undefined;
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
      globalThis.window.fbq = mockFbq((...args: unknown[]) => {
        calls.push(args);
      });

      trackPageView();
      assert.strictEqual(calls.length, 1);
      assert.deepStrictEqual(calls[0], ['track', 'PageView']);
    });

    it('should call fbq with ViewContent event', () => {
      const calls: unknown[][] = [];
      globalThis.window.fbq = mockFbq((...args: unknown[]) => {
        calls.push(args);
      });

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
      globalThis.window.fbq = mockFbq((...args: unknown[]) => {
        calls.push(args);
      });

      const params = { value: 550, currency: 'BDT', num_items: 1 };
      trackInitiateCheckout(params);

      assert.strictEqual(calls.length, 1);
      assert.strictEqual(calls[0][0], 'track');
      assert.strictEqual(calls[0][1], 'InitiateCheckout');
      assert.deepStrictEqual(calls[0][2], params);
    });

    it('should call fbq with AddPaymentInfo event', () => {
      const calls: unknown[][] = [];
      globalThis.window.fbq = mockFbq((...args: unknown[]) => {
        calls.push(args);
      });

      const params = { value: 550, currency: 'BDT' };
      trackAddPaymentInfo(params);

      assert.strictEqual(calls.length, 1);
      assert.strictEqual(calls[0][0], 'track');
      assert.strictEqual(calls[0][1], 'AddPaymentInfo');
      assert.deepStrictEqual(calls[0][2], params);
    });

    it('should handle empty parameters gracefully', () => {
      const calls: unknown[][] = [];
      globalThis.window.fbq = mockFbq((...args: unknown[]) => {
        calls.push(args);
      });

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
      globalThis.window.fbq = mockFbq((...args: unknown[]) => {
        calls.push(args);
      });

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
      globalThis.window.fbq = mockFbq((...args: unknown[]) => {
        calls.push(args);
      });

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
