/**
 * Meta Conversions API Server-Side Module
 *
 * Handles production-grade server-side conversion tracking to Meta.
 * This module is SERVER-ONLY and never exposed to the browser.
 *
 * Environment variables:
 * - NEXT_PUBLIC_META_PIXEL_ID: Browser Pixel ID (optional)
 * - META_CAPI_ACCESS_TOKEN: Server access token (secret, required for CAPI)
 * - META_CAPI_TEST_EVENT_CODE: Test event code (optional)
 */

import crypto from 'crypto';
import { isIP } from 'net';
import {
  ATTRIBUTION_COOKIE_NAME,
  buildFbcFromFbclid,
  isSafeAttributionValue,
  isValidFbc,
  isValidFbp,
  mergeAttribution,
  parseAttributionSnapshot,
  type AttributionSnapshot,
} from './attribution';
import { SITE_ORIGIN } from './site-config';

export const CAPI_REQUEST_TIMEOUT_MS = 10000;
export const CAPI_GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || 'v26.0';

export function normalizeStoredConversionTimestamp(payload: Record<string, unknown>): Date {
  const rawTimestamp = payload.timestamp;
  const timestamp = new Date(rawTimestamp instanceof Date ? rawTimestamp.getTime() : rawTimestamp as string | number);
  if (Number.isNaN(timestamp.getTime())) {
    throw new Error('Stored conversion event has an invalid timestamp');
  }
  return timestamp;
}

interface CapiUserData {
  ph?: string;
  fbp?: string;
  fbc?: string;
  client_user_agent?: string;
  client_ip_address?: string;
}

interface CapiCustomData {
  value: number;
  currency: string;
  content_type?: string;
  content_ids?: string[];
  content_name?: string;
  num_items?: number;
}

export interface CapiEventPayload {
  event_name: string;
  event_time: number;
  event_id: string;
  action_source: string;
  event_source_url?: string;
  user_data: CapiUserData;
  custom_data: CapiCustomData;
}

export type CapiSendResult =
  | { ok: true; eventId: string; eventsReceived: number; fbtraceId?: string }
  | { ok: false; error: string };

/**
 * Normalize a phone number according to Meta requirements for hashing.
 * Supports Bangladesh phone numbers (01xxx format and +880xxx format).
 */
export function normalizePhoneForMeta(phone: string | null | undefined): string | null {
  if (!phone) return null;

  let normalized = String(phone).trim();

  // Remove common formatting
  normalized = normalized.replace(/[\s\-\(\)\.]/g, '');

  // Convert 01xxx to 880 format if needed
  if (normalized.startsWith('01')) {
    normalized = '880' + normalized.substring(1);
  }

  // Remove leading plus sign
  if (normalized.startsWith('+')) {
    normalized = normalized.substring(1);
  }

  // Must be a reasonable length for a phone number
  if (normalized.length < 10 || normalized.length > 15) {
    return null;
  }

  return normalized;
}

/**
 * SHA-256 hash a value (for phone, email, etc.)
 */
export function sha256Hash(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Normalize and hash a phone number for Meta customer matching.
 * Returns null if phone is invalid.
 */
export function hashPhoneForMeta(phone: string | null | undefined): string | null {
  const normalized = normalizePhoneForMeta(phone);
  if (!normalized) return null;
  return sha256Hash(normalized);
}

/**
 * Check if Meta CAPI is configured.
 */
export function isCapiConfigured(): boolean {
  return Boolean(process.env.META_CAPI_ACCESS_TOKEN);
}

/**
 * Build a Meta Conversions API Purchase event payload.
 */
export function buildPurchaseEventPayload(options: {
  orderId: string;
  orderNumber: string;
  value: number;
  currency: string;
  quantity: number;
  productId?: string;
  productName?: string;
  timestamp: Date;
  phone?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  userAgent?: string | null;
  clientIp?: string | null;
}): CapiEventPayload {
  const eventTime = Math.floor(options.timestamp.getTime() / 1000);
  const eventId = `purchase_${options.orderId}`;

  const userData: CapiUserData = {};

  // Add hashed phone
  const hashedPhone = hashPhoneForMeta(options.phone);
  if (hashedPhone) {
    userData.ph = hashedPhone;
  }

  // Add Meta browser identifiers
  if (options.fbp) {
    userData.fbp = options.fbp;
  }
  if (options.fbc) {
    userData.fbc = options.fbc;
  }

  // Add request context (only if legitimately available)
  if (options.userAgent) {
    userData.client_user_agent = options.userAgent;
  }
  if (options.clientIp) {
    userData.client_ip_address = options.clientIp;
  }

  const customData: CapiCustomData = {
    value: options.value,
    currency: options.currency,
    content_type: 'product',
    content_ids: options.productId ? [options.productId] : undefined,
    content_name: options.productName,
    num_items: options.quantity,
  };

  // Remove undefined fields
  Object.keys(customData).forEach(
    (key) => customData[key as keyof CapiCustomData] === undefined && delete customData[key as keyof CapiCustomData]
  );

  return {
    event_name: 'Purchase',
    event_time: eventTime,
    event_id: eventId,
    action_source: 'website',
    event_source_url: `${SITE_ORIGIN}/order/${options.orderNumber}`,
    user_data: userData,
    custom_data: customData,
  };
}

export function buildCapiRequestBody(payload: CapiEventPayload, token: string): Record<string, unknown> {
  const testEventCode = process.env.META_CAPI_TEST_EVENT_CODE?.trim();
  return {
    data: [payload],
    access_token: token,
    ...(testEventCode ? { test_event_code: testEventCode } : {}),
  };
}

function readMetaError(data: unknown, status: number): string {
  const response = data && typeof data === 'object' ? data as Record<string, unknown> : {};
  const error = response.error && typeof response.error === 'object' ? response.error as Record<string, unknown> : {};
  const details = [
    typeof error.message === 'string' ? error.message : 'Meta API request failed',
    typeof error.code === 'number' || typeof error.code === 'string' ? `code=${error.code}` : null,
    typeof error.error_subcode === 'number' || typeof error.error_subcode === 'string' ? `subcode=${error.error_subcode}` : null,
    typeof error.type === 'string' ? `type=${error.type}` : null,
    typeof response.fbtrace_id === 'string' ? `fbtrace_id=${response.fbtrace_id}` : null,
  ].filter((detail): detail is string => Boolean(detail));
  return `Meta API HTTP ${status}: ${details.join('; ')}`;
}

/**
 * Send a Conversions API event to Meta.
 * Returns the event ID on success, null on failure.
 *
 * Failures are logged but do NOT throw - the order transaction must not fail due to Meta issues.
 */
export async function sendCapiEvent(payload: CapiEventPayload): Promise<CapiSendResult> {
  if (!isCapiConfigured()) {
    console.warn('[Meta CAPI] Conversions API not configured (META_CAPI_ACCESS_TOKEN missing)');
    return { ok: false, error: 'Meta CAPI is not configured' };
  }

  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  if (!pixelId) {
    console.warn('[Meta CAPI] Meta Pixel ID not configured (NEXT_PUBLIC_META_PIXEL_ID missing)');
    return { ok: false, error: 'Meta Pixel ID is not configured' };
  }

  const url = `https://graph.facebook.com/${CAPI_GRAPH_API_VERSION}/${pixelId}/events`;
  const token = process.env.META_CAPI_ACCESS_TOKEN;
  if (!token) return { ok: false, error: 'Meta CAPI is not configured' };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CAPI_REQUEST_TIMEOUT_MS);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildCapiRequestBody(payload, token)),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      const error = readMetaError(data, response.status);
      console.error('[Meta CAPI] API error', {
        status: response.status,
        eventId: payload.event_id,
        error,
      });
      return { ok: false, error };
    }

    const eventsReceived = data && typeof data === 'object' && 'events_received' in data
      ? Number((data as { events_received?: unknown }).events_received)
      : Number.NaN;
    const fbtraceId = data && typeof data === 'object' && typeof (data as { fbtrace_id?: unknown }).fbtrace_id === 'string'
      ? (data as { fbtrace_id: string }).fbtrace_id
      : undefined;
    if (Number.isFinite(eventsReceived) && eventsReceived >= 1) {
      console.log('[Meta CAPI] Event sent successfully', {
        eventId: payload.event_id,
        eventsReceived,
        fbtraceId,
      });
      return { ok: true, eventId: payload.event_id, eventsReceived, fbtraceId };
    }

    const error = 'Meta API 2xx response did not report events_received >= 1';
    console.error('[Meta CAPI] Unexpected response format', {
      eventId: payload.event_id,
      error,
    });
    return { ok: false, error };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[Meta CAPI] Request timeout', {
        eventId: payload.event_id,
        timeout: CAPI_REQUEST_TIMEOUT_MS,
      });
      return { ok: false, error: 'Meta API request timed out' };
    } else {
      console.error('[Meta CAPI] Request failed', {
        eventId: payload.event_id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { ok: false, error: 'Meta API request failed' };
    }
  }
}

/**
 * Extract and normalize UTM parameters from a URL or query string.
 */
export function extractUtmParams(url: string | null | undefined): Record<string, string | undefined> {
  if (!url) return {};

  try {
    const urlObj = new URL(url, SITE_ORIGIN);
    const result: Record<string, string | undefined> = {};

    const utm_source = urlObj.searchParams.get('utm_source');
    if (utm_source) result.utm_source = utm_source;

    const utm_medium = urlObj.searchParams.get('utm_medium');
    if (utm_medium) result.utm_medium = utm_medium;

    const utm_campaign = urlObj.searchParams.get('utm_campaign');
    if (utm_campaign) result.utm_campaign = utm_campaign;

    const utm_content = urlObj.searchParams.get('utm_content');
    if (utm_content) result.utm_content = utm_content;

    const utm_term = urlObj.searchParams.get('utm_term');
    if (utm_term) result.utm_term = utm_term;

    return result;
  } catch {
    return {};
  }
}

/**
 * Extract attribution parameters from request headers.
 * Be careful with X-Forwarded-For and similar headers - only trust if behind a trusted proxy.
 */
export function extractAttributionFromRequest(request: Request): {
  fbclid?: string;
  fbp?: string;
  fbc?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  userAgent?: string;
  clientIp?: string;
} {
  const attribution: AttributionSnapshot & { userAgent?: string; clientIp?: string } = {};

  const cookieHeader = request.headers.get('cookie') || '';
  const cookies: Record<string, string> = {};
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      // Ignore malformed cookie values.
    }
  }
  const stored = parseAttributionSnapshot(cookies[ATTRIBUTION_COOKIE_NAME]);
  const incoming: AttributionSnapshot = { ...stored };

  // Extract fbclid, fbp, fbc from URL if present
  try {
    const url = new URL(request.url);
    for (const key of ['fbclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const) {
      const value = url.searchParams.get(key);
      if (value && isSafeAttributionValue(value)) incoming[key] = value;
    }
  } catch {
    // Ignore URL parse errors
  }

  const fbp = cookies._fbp;
  const fbc = cookies._fbc;
  if (isValidFbp(fbp)) incoming.fbp = fbp;
  if (isValidFbc(fbc)) incoming.fbc = fbc;
  const merged = mergeAttribution({}, incoming);
  Object.assign(attribution, merged);
  if (attribution.fbclid && !isValidFbc(attribution.fbc)) {
    const constructedFbc = buildFbcFromFbclid(attribution.fbclid);
    if (constructedFbc) attribution.fbc = constructedFbc;
  }

  // Extract user agent
  const userAgent = request.headers.get('user-agent');
  if (userAgent && userAgent.length <= 1000 && !/[\u0000-\u001f\u007f]/.test(userAgent)) {
    attribution.userAgent = userAgent;
  }

  // Try to get client IP - be reverse-proxy aware
  // Only trust X-Forwarded-For if behind known reverse proxy (Nginx, CloudFlare, etc)
  // For now, we accept X-Forwarded-For as the client can forge it but it's useful for matching
  const xForwardedFor = request.headers.get('x-forwarded-for');
  let clientIp: string | undefined;
  if (xForwardedFor) {
    clientIp = xForwardedFor.split(',')[0].trim();
  }
  if (!clientIp) {
    const xRealIp = request.headers.get('x-real-ip');
    if (xRealIp) {
      clientIp = xRealIp;
    }
  }
  if (clientIp && isIP(clientIp.trim())) {
    attribution.clientIp = clientIp.trim();
  }

  return attribution;
}
