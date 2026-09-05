# AUDIT_12A1: Meta Pixel Browser Tracking Foundation

**Status:** BOOK_SALES_COMMAND_12A1_COMPLETE

**Date:** 2026-09-05

**Scope:** Browser-side Meta Pixel implementation only. **Purchase event intentionally deferred to Conversions API (CAPI)** in COMMAND 12A2.

---

## Overview

This implementation adds centralized Meta Pixel browser tracking to the book sales website. The solution:

- ✅ Loads the official Meta Pixel library once per session
- ✅ Gracefully degrades when `NEXT_PUBLIC_META_PIXEL_ID` is not configured
- ✅ Prevents duplicate script injection
- ✅ Handles Next.js client-side navigation correctly
- ✅ Tracks PageView on initial load and route changes
- ✅ Implements standard events (ViewContent, InitiateCheckout, AddPaymentInfo)
- ✅ Does **NOT** implement Purchase event (reserved for CAPI in COMMAND 12A2)
- ✅ Maintains privacy and data safety best practices

---

## Files Changed

### New Files

| File | Purpose |
|------|---------|
| `src/lib/meta-pixel.ts` | Centralized Meta Pixel helper layer with type-safe event tracking functions |
| `src/components/meta-pixel-provider.tsx` | Client-side Pixel initialization and PageView tracking for route changes |
| `tests/meta-pixel.test.ts` | Automated tests for graceful degradation, event firing, and data safety |
| `docs/AUDIT_12A1_META_PIXEL_BROWSER.md` | This documentation |

### Modified Files

| File | Changes |
|------|---------|
| `.env.example` | Added `NEXT_PUBLIC_META_PIXEL_ID=""` |
| `src/app/layout.tsx` | Added import and `<MetaPixelProvider />` component to root layout |
| `src/components/checkout-form.tsx` | Added `trackViewContent()` on mount and `trackInitiateCheckout()` on successful submission |
| `src/components/payment-form.tsx` | Added `trackAddPaymentInfo()` on successful submission |

---

## Environment Variable

### Required Configuration

```bash
NEXT_PUBLIC_META_PIXEL_ID="{your-pixel-id}"
```

- **Type:** `string` (public, safe to expose in client-side code)
- **Required:** No (site continues working if absent)
- **When to set:** Only in production and staging environments with configured Meta Business Account
- **Example:** `NEXT_PUBLIC_META_PIXEL_ID="123456789"`

**Never hard-code the Pixel ID in source files.** Use the environment variable exclusively.

---

## Architecture

### 1. Meta Pixel Initialization

**Location:** `src/components/meta-pixel-provider.tsx`

The `<MetaPixelProvider />` component (inserted in root layout):

1. Runs once on app mount via `useEffect` with `[pixelId]` dependency
2. Creates the global `fbq()` queue if it doesn't exist
3. Loads the official Meta Pixel library script from `https://connect.facebook.net/en_US/fbevents.js`
4. Initializes with the Pixel ID: `fbq('init', pixelId)`
5. Fires initial PageView: `fbq('track', 'PageView')`

**Duplicate Prevention:**
- Checks if `window.fbq` already exists before initialization
- Only one `<MetaPixelProvider />` in the component tree (root layout)
- The script's native `async` attribute prevents blocking

**Graceful Degradation:**
- If `NEXT_PUBLIC_META_PIXEL_ID` is empty or undefined, initialization is skipped
- All event tracking functions check for `window.fbq` before firing
- Site continues operating normally without Meta Pixel

### 2. Helper Layer

**Location:** `src/lib/meta-pixel.ts`

Provides four exported functions with TypeScript type safety:

```typescript
// Track initial page load and client-side navigation
trackPageView(): void

// Track product/book content viewing
trackViewContent(params?: ViewContentParams): void

// Track checkout initiation (after form validation succeeds)
trackInitiateCheckout(params?: InitiateCheckoutParams): void

// Track payment information submission (after validation succeeds)
trackAddPaymentInfo(params?: AddPaymentInfoParams): void
```

Each function:
- Checks for `typeof window !== 'undefined'` (SSR safe)
- Checks for `window.fbq` existence before calling
- Does not expose sensitive data
- Has optional parameters with sensible defaults

---

## Event Mapping

### PageView

**When Fired:**
1. When `<MetaPixelProvider />` initializes (initial page load)
2. When Next.js routing changes (`usePathname()` hook dependency)

**Parameters:** None (standard)

**Implementation:**
- `src/components/meta-pixel-provider.tsx` → `useEffect` with `[pathname, pixelId]` dependency
- Prevents duplicate PageView from React re-renders by tracking only on pathname changes

---

### ViewContent

**When Fired:** When customer navigates to `/order` checkout page (CheckoutForm component mounts)

**Parameters Sent:**
```typescript
{
  content_type: 'product',
  content_name: '{book title}',
  value: {book price in BDT},
  currency: 'BDT'
}
```

**Implementation:**
- `src/components/checkout-form.tsx` → `useEffect` on component mount
- Dependency array: `[bookTitle, pricing.bookPrice]` (fires once on render, refires only if book details change)
- Represents the moment customer views the product details/pricing

---

### InitiateCheckout

**When Fired:** When customer successfully submits the CheckoutForm (after server validation passes)

**Parameters Sent:**
```typescript
{
  value: {total order value in BDT},
  currency: 'BDT',
  num_items: 1
}
```

**Implementation:**
- `src/components/checkout-form.tsx` → `submit()` handler
- Fires **only after** successful form submission and validation on the server
- Fires **before** redirect to payment page
- Does NOT fire if validation fails (form shows error, user doesn't proceed)

**Business Flow Context:**
```
Customer fills checkout form
         ↓
Submit (form validation + server validation)
         ↓
Valid: trackInitiateCheckout() → redirect to /order/{number}/payment
  OR
Invalid: show error, no tracking
```

---

### AddPaymentInfo

**When Fired:** When customer successfully submits payment details on the payment page (after server validation passes)

**Parameters Sent:**
```typescript
{
  value: {amount being paid in BDT},
  currency: 'BDT'
}
```

**Implementation:**
- `src/components/payment-form.tsx` → `submit()` handler
- Fires **only after** successful payment details submission and server validation
- Fires **before** redirect to success page
- Does NOT fire if validation fails (form shows error, user doesn't proceed)

**Business Flow Context:**
```
Customer submits payment proof and details
         ↓
Server validates and stores payment record
         ↓
Valid: trackAddPaymentInfo() → redirect to /order/success/{number}
  OR
Invalid: show error, no tracking
```

**Important:** This tracks the action of submitting payment information, NOT a confirmed payment. The order canonical lifecycle is:
```
AWAITING_PAYMENT → PAYMENT_SUBMITTED → CONFIRMED → PACKED → SHIPPED → DELIVERED
```

Purchase event will be fired server-side via Conversions API when the business reaches the **CONFIRMED** state (COMMAND 12A2).

---

## Testing

### Automated Tests

Run the Meta Pixel test suite:

```bash
npm test
```

Tests verify:
- ✅ Functions do not throw when `fbq` is undefined (graceful degradation)
- ✅ Each event fires with correct parameters
- ✅ No sensitive data (addresses, transaction IDs, payment methods) is exposed
- ✅ Purchase event function does NOT exist
- ✅ Empty parameters are handled gracefully

**Test File:** `tests/meta-pixel.test.ts`

### Manual Testing in Meta Events Manager

1. **Configure Pixel ID:** Set `NEXT_PUBLIC_META_PIXEL_ID` in `.env.local` with a test Pixel ID
2. **Start dev server:** `npm run dev` (default: `http://localhost:2200`)
3. **Open Meta Events Manager:**
   - Go to Meta Business Suite → Events Manager
   - Select your test Pixel
   - Go to "Test Events" tab
4. **Test PageView:**
   - Visit `http://localhost:2200/`
   - You should see PageView appear in Events Manager within seconds
   - Navigate to `/order`
   - You should see another PageView
5. **Test ViewContent:**
   - Ensure you're on `/order` page
   - CheckoutForm mounts → ViewContent should appear
   - Verify parameters: `content_name`, `value`, `currency`
6. **Test InitiateCheckout:**
   - Fill out checkout form completely
   - Submit form
   - If validation passes, InitiateCheckout should appear in Events Manager
   - You'll be redirected to the payment page
7. **Test AddPaymentInfo:**
   - On payment page, fill out payment details (bKash/Nagad number, transaction ID, proof screenshot)
   - Submit form
   - If validation passes, AddPaymentInfo should appear in Events Manager
   - You'll be redirected to success page

**Troubleshooting:**
- Events not appearing? Check that NEXT_PUBLIC_META_PIXEL_ID is set and valid
- Script not loading? Open DevTools → Network tab, look for `fbevents.js` request
- Check Console for errors

---

## Production Deployment

### Pre-Production Checklist

Before deploying to production:

1. **Verify Pixel ID is configured:**
   - Ensure production Pixel ID is in `.env` (not `.env.example`)
   - Verify Pixel ID is from Meta Business Account
   - Confirm Pixel is active in Meta Business Suite

2. **Verify no sensitive data in events:**
   - Review `src/lib/meta-pixel.ts` for exposed parameters
   - Confirm checkout-form.tsx only sends `value`, `currency`, `num_items`
   - Confirm payment-form.tsx only sends `value`, `currency`

3. **Test in production environment:**
   - Configure with production Pixel ID (or staging Pixel if available)
   - Run `npm run build && npm start`
   - Verify events appear in Meta Events Manager

4. **Security check:**
   - Verify `.env` file is NOT in git history
   - Confirm `.env.example` contains only variable names
   - Check that deployment service (e.g., Vercel) has Pixel ID configured

5. **Review CSP headers (if present):**
   - Currently no Content-Security-Policy in next.config.ts
   - If CSP is added later, ensure `https://connect.facebook.net` is allowed for script-src

### Production Configuration Example

```bash
# In your production environment (.env production):
NEXT_PUBLIC_META_PIXEL_ID="1234567890"  # Your actual production Pixel ID
NEXT_PUBLIC_SITE_URL="https://yoursite.com"

# Deployed to hosting (e.g., Vercel):
# Set environment variable in deployment dashboard
```

---

## Security & Privacy

### What Is Sent to Meta

Browser tracking sends only:

- **PageView:** No PII; just URL context
- **ViewContent:** Product name, price, currency
- **InitiateCheckout:** Order total, item count, currency
- **AddPaymentInfo:** Order total, currency

### What Is NOT Sent

🚫 Never sent through browser Pixel:

- Full delivery addresses
- Transaction IDs
- Payment method details (bKash/Nagad account numbers)
- Payment proof images (screenshots)
- Customer mobile numbers
- Admin information
- Passwords
- CAPI access tokens
- Email addresses

### CAPI Integration (Future)

Purchase event will be implemented server-side in COMMAND 12A2 using Conversions API (CAPI). CAPI allows:
- Server-to-server communication (more secure)
- Hashed customer data for matching
- Authoritative business state (order confirmed, not just payment submitted)
- Compliance with privacy regulations

---

## FAQ

### Q: Why is Purchase not implemented in browser Pixel?

**A:** The order lifecycle has multiple stages (AWAITING_PAYMENT → CONFIRMED → etc.). Browser-side, we cannot reliably know when an order is truly confirmed by business logic. Purchase events via CAPI (server-side) will be fired when the canonical business state is CONFIRMED, ensuring accuracy for Meta's algorithms.

### Q: What if NEXT_PUBLIC_META_PIXEL_ID is not set?

**A:** The site continues working normally. Pixel initialization is skipped, and all event tracking functions return early without error. No Pixel events are sent.

### Q: Will PageView fire twice on initial load?

**A:** No. The provider initializes once, fires the initial PageView in the script's `onload` handler, and then uses `usePathname()` to track subsequent navigations. React component re-renders do not retrigger initialization.

### Q: Can I disable tracking for certain users?

**A:** Currently, all users are tracked if Pixel ID is configured. For GDPR/privacy compliance, you could wrap tracking calls with a consent check (e.g., a cookie consent banner). This can be added to `meta-pixel.ts` functions later if needed.

### Q: How do I test before going live?

**A:** Use a test Pixel ID and follow the "Manual Testing in Meta Events Manager" section above. Events will appear in the test Pixel's Events Manager within a few seconds.

---

## Next Steps

**COMMAND 12A2:** Meta Attribution + Conversions API Purchase

- Implement server-side Purchase event tracking via Meta Conversions API
- Fire Purchase when order reaches CONFIRMED canonical state
- Implement customer data hashing for advanced matching
- Add privacy controls and consent checks

---

## Verification Checklist

- ✅ Meta Pixel loads once per session
- ✅ Graceful degradation when Pixel ID absent
- ✅ No duplicate script injection
- ✅ PageView fires on initial load and route changes
- ✅ ViewContent fires when customer views checkout
- ✅ InitiateCheckout fires when checkout form submitted successfully
- ✅ AddPaymentInfo fires when payment form submitted successfully
- ✅ Purchase event NOT implemented (intentional)
- ✅ No sensitive data exposed
- ✅ Automated tests pass
- ✅ TypeScript compilation passes
- ✅ ESLint passes
- ✅ Build completes successfully
- ✅ Environment variable documented

---

## References

- [Meta Pixel Official Documentation](https://developers.facebook.com/docs/facebook-pixel)
- [Meta Conversions API](https://developers.facebook.com/docs/marketing-api/conversions-api)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Next.js Client-Side Navigation](https://nextjs.org/docs/app/building-your-application/routing/linking-and-navigating#usepathnameusesearchparams)
