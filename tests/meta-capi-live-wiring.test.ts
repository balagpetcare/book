import test from 'node:test';
import assert from 'node:assert/strict';
import { ATTRIBUTION_COOKIE_NAME, buildFbcFromFbclid, mergeAttribution } from '@/lib/attribution';
import { buildCapiRequestBody, buildPurchaseEventPayload, extractAttributionFromRequest, normalizeStoredConversionTimestamp, sendCapiEvent } from '@/lib/meta-capi';
import { getConversionFailureState } from '@/app/api/internal/process-conversions/route';
import { SITE_ORIGIN } from '@/lib/site-config';

test('landing attribution survives navigation through the first-party snapshot', () => {
  const snapshot = mergeAttribution({}, { fbclid: 'test-click', utm_source: 'facebook', utm_medium: 'paid_social', utm_campaign: 'book_test', utm_content: 'video_1' });
  const request = new Request('https://book.balagpetclinic.com/api/orders', {
    headers: { cookie: `${ATTRIBUTION_COOKIE_NAME}=${encodeURIComponent(JSON.stringify(snapshot))}; _fbp=fb.1.1700000000000.12345`, 'user-agent': 'Test Browser', 'x-real-ip': '203.0.113.10' },
  });
  const attribution = extractAttributionFromRequest(request);
  assert.equal(attribution.fbclid, 'test-click');
  assert.equal(attribution.utm_source, 'facebook');
  assert.equal(attribution.utm_medium, 'paid_social');
  assert.equal(attribution.utm_campaign, 'book_test');
  assert.equal(attribution.utm_content, 'video_1');
  assert.equal(attribution.fbp, 'fb.1.1700000000000.12345');
  assert.match(attribution.fbc || '', /^fb\.1\.\d+\.test-click$/);
  assert.equal(attribution.userAgent, 'Test Browser');
  assert.equal(attribution.clientIp, '203.0.113.10');
});

test('direct traffic remains valid without attribution', () => {
  const attribution = extractAttributionFromRequest(new Request('https://book.balagpetclinic.com/api/orders'));
  assert.equal(attribution.fbclid, undefined);
  assert.equal(attribution.utm_source, undefined);
});

test('Purchase payload contains canonical URL, order value, identifiers, and context', () => {
  const payload = buildPurchaseEventPayload({ orderId: 'order-123', orderNumber: 'BG-2609-00001', value: 350, currency: 'BDT', quantity: 1, timestamp: new Date('2026-09-05T12:00:00.000Z'), phone: '01712345678', fbp: 'fb.1.1700000000000.12345', fbc: buildFbcFromFbclid('test-click', 1700000000000), userAgent: 'Test Browser', clientIp: '203.0.113.10' });
  assert.equal(payload.event_name, 'Purchase');
  assert.equal(payload.action_source, 'website');
  assert.equal(payload.event_source_url, `${SITE_ORIGIN}/order/BG-2609-00001`);
  assert.equal(payload.event_id, 'purchase_order-123');
  assert.equal(payload.custom_data.currency, 'BDT');
  assert.equal(payload.custom_data.value, 350);
  assert.equal(payload.user_data.ph, 'c327520f85b0c6058fed05dfc0a63d8755f325b6ea1b550824f4a8e380d75de1');
  assert.equal(payload.user_data.fbp, 'fb.1.1700000000000.12345');
  assert.equal(payload.user_data.fbc, 'fb.1.1700000000000.test-click');
  assert.equal(payload.user_data.client_user_agent, 'Test Browser');
  assert.equal(payload.user_data.client_ip_address, '203.0.113.10');
  assert.equal(payload.event_source_url.includes('book.example.com'), false);
});

test('JSON round-trip timestamp is normalized before Purchase payload construction', () => {
  const parsed = JSON.parse(JSON.stringify({ timestamp: new Date('2026-09-05T12:34:56.000Z') })) as Record<string, unknown>;
  const timestamp = normalizeStoredConversionTimestamp(parsed);
  const payload = buildPurchaseEventPayload({ orderId: 'order-json', orderNumber: 'BG-JSON', value: 350, currency: 'BDT', quantity: 1, timestamp, phone: '01712345678' });
  assert.equal(payload.event_name, 'Purchase');
  assert.equal(payload.event_time, 1788611696);
  assert.equal(payload.event_id, 'purchase_order-json');
  assert.equal(payload.event_source_url, 'https://book.balagpetclinic.com/order/BG-JSON');
});

test('invalid stored conversion timestamp is rejected instead of replaced', () => {
  assert.throws(() => normalizeStoredConversionTimestamp({ timestamp: 'not-a-date' }), /invalid timestamp/);
});

test('CAPI success uses events_received and returns the local event ID', async () => {
  const previousToken = process.env.META_CAPI_ACCESS_TOKEN;
  const previousPixel = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const previousFetch = globalThis.fetch;
  process.env.META_CAPI_ACCESS_TOKEN = 'test-token-never-logged';
  process.env.NEXT_PUBLIC_META_PIXEL_ID = '1558416609371367';
  let requestBody: Record<string, unknown> | undefined;
  globalThis.fetch = async (_input, init) => {
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(JSON.stringify({ events_received: 1, messages: [], fbtrace_id: 'trace-test' }), { status: 200 });
  };
  try {
    const payload = buildPurchaseEventPayload({ orderId: 'order-success', orderNumber: 'BG-SUCCESS', value: 350, currency: 'BDT', quantity: 1, timestamp: new Date('2026-09-05T12:00:00.000Z'), phone: '01712345678' });
    const result = await sendCapiEvent(payload);
    assert.deepEqual(result, { ok: true, eventId: 'purchase_order-success', eventsReceived: 1, fbtraceId: 'trace-test' });
    assert.deepEqual((requestBody?.data as Array<Record<string, unknown>>)[0], payload);
    assert.equal((requestBody?.data as Array<Record<string, unknown>>)[0].test_event_code, undefined);
    assert.equal(requestBody?.access_token, 'test-token-never-logged');
    assert.equal(requestBody?.test_event_code, undefined);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousToken === undefined) delete process.env.META_CAPI_ACCESS_TOKEN; else process.env.META_CAPI_ACCESS_TOKEN = previousToken;
    if (previousPixel === undefined) delete process.env.NEXT_PUBLIC_META_PIXEL_ID; else process.env.NEXT_PUBLIC_META_PIXEL_ID = previousPixel;
  }
});

test('configured test event code is top-level and blank code is omitted', () => {
  const payload = buildPurchaseEventPayload({ orderId: 'order-body', orderNumber: 'BG-BODY', value: 350, currency: 'BDT', quantity: 1, timestamp: new Date('2026-09-05T12:00:00.000Z') });
  const previousCode = process.env.META_CAPI_TEST_EVENT_CODE;
  try {
    process.env.META_CAPI_TEST_EVENT_CODE = 'TEST-123';
    const withCode = buildCapiRequestBody(payload, 'secret-not-for-logs');
    assert.equal(withCode.test_event_code, 'TEST-123');
    assert.equal((withCode.data as Array<Record<string, unknown>>)[0].test_event_code, undefined);
    process.env.META_CAPI_TEST_EVENT_CODE = '   ';
    assert.equal(buildCapiRequestBody(payload, 'secret-not-for-logs').test_event_code, undefined);
  } finally {
    if (previousCode === undefined) delete process.env.META_CAPI_TEST_EVENT_CODE; else process.env.META_CAPI_TEST_EVENT_CODE = previousCode;
  }
});

test('HTTP errors remain failures with safe Meta diagnostics', async () => {
  const previousToken = process.env.META_CAPI_ACCESS_TOKEN;
  const previousPixel = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const previousFetch = globalThis.fetch;
  process.env.META_CAPI_ACCESS_TOKEN = 'secret-token-not-logged';
  process.env.NEXT_PUBLIC_META_PIXEL_ID = '1558416609371367';
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { message: 'Invalid test event', code: 100, error_subcode: 190, type: 'OAuthException' }, fbtrace_id: 'trace-error' }), { status: 400 });
  try {
    const payload = buildPurchaseEventPayload({ orderId: 'order-error', orderNumber: 'BG-ERROR', value: 350, currency: 'BDT', quantity: 1, timestamp: new Date('2026-09-05T12:00:00.000Z') });
    const result = await sendCapiEvent(payload);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /HTTP 400/);
      assert.match(result.error, /Invalid test event/);
      assert.match(result.error, /code=100/);
      assert.match(result.error, /subcode=190/);
      assert.match(result.error, /OAuthException/);
      assert.match(result.error, /trace-error/);
      assert.equal(result.error.includes('secret-token-not-logged'), false);
    }
  } finally {
    globalThis.fetch = previousFetch;
    if (previousToken === undefined) delete process.env.META_CAPI_ACCESS_TOKEN; else process.env.META_CAPI_ACCESS_TOKEN = previousToken;
    if (previousPixel === undefined) delete process.env.NEXT_PUBLIC_META_PIXEL_ID; else process.env.NEXT_PUBLIC_META_PIXEL_ID = previousPixel;
  }
});

test('third failed attempt becomes FAILED and exhausted events are not retried', () => {
  assert.deepEqual(getConversionFailureState(2, 'safe failure'), { attemptCount: 3, status: 'FAILED', lastError: 'safe failure' });
  assert.deepEqual(getConversionFailureState(0, 'safe failure'), { attemptCount: 1, status: 'PENDING', lastError: 'safe failure' });
});
