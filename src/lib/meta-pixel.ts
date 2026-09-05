/**
 * Meta Pixel Browser Tracking Helper Layer
 *
 * Provides a type-safe, centralized interface for firing Meta Pixel standard events.
 * This layer abstracts the direct fbq() calls and allows for validation/privacy considerations.
 */

export interface MetaPixelFunction {
  (action: string, ...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push: MetaPixelFunction;
  loaded: boolean;
  version: string;
}

interface ViewContentParams extends Record<string, unknown> {
  content_type?: string;
  content_ids?: string[];
  content_name?: string;
  value?: number;
  currency?: string;
}

interface InitiateCheckoutParams extends Record<string, unknown> {
  value?: number;
  currency?: string;
  num_items?: number;
}

interface AddPaymentInfoParams extends Record<string, unknown> {
  value?: number;
  currency?: string;
}

declare global {
  interface Window {
    fbq?: MetaPixelFunction;
    _fbq?: MetaPixelFunction;
  }
}

/**
 * Track a PageView event.
 * Called on initial page load and subsequent Next.js navigation.
 */
export function trackPageView(): void {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'PageView');
  }
}

/**
 * Track when customer views product/book content.
 * Include content information if available.
 */
export function trackViewContent(params?: ViewContentParams): void {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'ViewContent', params ?? {});
  }
}

/**
 * Track when customer initiates checkout.
 * Should only fire when customer genuinely begins the order process,
 * not on validation failures or unrelated button clicks.
 */
export function trackInitiateCheckout(params?: InitiateCheckoutParams): void {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'InitiateCheckout', params ?? {});
  }
}

/**
 * Track when customer provides payment information.
 * Should only fire after customer data is valid and flow successfully
 * reaches the payment step, not merely because a button was clicked.
 */
export function trackAddPaymentInfo(params?: AddPaymentInfoParams): void {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'AddPaymentInfo', params ?? {});
  }
}
