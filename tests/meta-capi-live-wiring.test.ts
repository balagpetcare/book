import test from 'node:test';
import assert from 'node:assert/strict';
import { ATTRIBUTION_COOKIE_NAME, buildFbcFromFbclid, mergeAttribution } from '@/lib/attribution';
import { buildPurchaseEventPayload, extractAttributionFromRequest } from '@/lib/meta-capi';
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
