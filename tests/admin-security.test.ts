import "dotenv/config";
import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { spawn, ChildProcess } from "node:child_process";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

const PORT = 2299;
const BASE = `http://localhost:${PORT}`;
const TEST_PASSWORD = "TestPass1234!";
const ADMIN_EMAIL = "qa-admin@security-test.local";
const SUPER_ADMIN_EMAIL = "qa-superadmin@security-test.local";

let server: ChildProcess;

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("Server did not become ready in time");
}

function cookieFrom(res: Response) {
  const raw = res.headers.get("set-cookie") || "";
  const match = raw.match(/book_admin_session=([^;]+)/);
  return match ? match[1] : "";
}

let ipCounter = 0;
function loginHeaders(extra?: Record<string, string>) {
  ipCounter += 1;
  return { "Content-Type": "application/json", "X-Forwarded-For": `10.99.0.${ipCounter}`, ...extra };
}

before(async () => {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  await prisma.adminUser.upsert({ where: { email: ADMIN_EMAIL }, update: { passwordHash, role: "ADMIN", isActive: true }, create: { email: ADMIN_EMAIL, passwordHash, role: "ADMIN", name: "QA Admin" } });
  await prisma.adminUser.upsert({ where: { email: SUPER_ADMIN_EMAIL }, update: { passwordHash, role: "SUPER_ADMIN", isActive: true }, create: { email: SUPER_ADMIN_EMAIL, passwordHash, role: "SUPER_ADMIN", name: "QA Super Admin" } });
  server = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", "-p", String(PORT)], { cwd: process.cwd(), stdio: "ignore" });
  await waitForServer();
});

after(async () => {
  server?.kill();
  const admin = await prisma.adminUser.findUnique({ where: { email: ADMIN_EMAIL } });
  const superAdmin = await prisma.adminUser.findUnique({ where: { email: SUPER_ADMIN_EMAIL } });
  const ids = [admin?.id, superAdmin?.id].filter((id): id is string => Boolean(id));
  if (ids.length) {
    await prisma.adminSession.deleteMany({ where: { adminUserId: { in: ids } } });
    await prisma.adminAuditLog.deleteMany({ where: { adminUserId: { in: ids } } });
    await prisma.adminUser.deleteMany({ where: { id: { in: ids } } });
  }
  await prisma.$disconnect();
});

test("1. unauthenticated GET /admin is rejected/redirected", async () => {
  const res = await fetch(`${BASE}/admin`, { redirect: "manual" });
  assert.equal(res.status, 307);
  assert.match(res.headers.get("location") || "", /\/admin\/login$/);
});

test("2. unauthenticated GET /admin/orders is rejected/redirected", async () => {
  const res = await fetch(`${BASE}/admin/orders`, { redirect: "manual" });
  assert.equal(res.status, 307);
  assert.match(res.headers.get("location") || "", /\/admin\/login$/);
});

test("3. unauthenticated admin API returns 401", async () => {
  const res = await fetch(`${BASE}/api/admin/settings`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  assert.equal(res.status, 401);
});

test("4. invalid login fails", async () => {
  const res = await fetch(`${BASE}/api/admin/login`, { method: "POST", headers: loginHeaders(), body: JSON.stringify({ email: ADMIN_EMAIL, password: "wrong-password" }) });
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.error, "Invalid email or password.");
});

test("5. valid admin login succeeds and 6. authenticated admin can access dashboard", async () => {
  const loginRes = await fetch(`${BASE}/api/admin/login`, { method: "POST", headers: loginHeaders(), body: JSON.stringify({ email: ADMIN_EMAIL, password: TEST_PASSWORD }) });
  assert.equal(loginRes.status, 200);
  const token = cookieFrom(loginRes);
  assert.ok(token.length > 20);

  const dashRes = await fetch(`${BASE}/admin`, { headers: { Cookie: `book_admin_session=${token}` } });
  assert.equal(dashRes.status, 200);
  const html = await dashRes.text();
  assert.match(html, /Dashboard/);
});

test("7. authenticated admin can access allowed admin API", async () => {
  const loginRes = await fetch(`${BASE}/api/admin/login`, { method: "POST", headers: loginHeaders(), body: JSON.stringify({ email: ADMIN_EMAIL, password: TEST_PASSWORD }) });
  const token = cookieFrom(loginRes);
  const res = await fetch(`${BASE}/api/admin/inventory`, { method: "POST", headers: { "Content-Type": "application/json", Cookie: `book_admin_session=${token}` }, body: JSON.stringify({ action: "ADJUST", quantity: 0, reason: "security test no-op" }) });
  assert.equal(res.status, 200);
});

test("8. logout invalidates session and 9. revoked session cannot be reused", async () => {
  const loginRes = await fetch(`${BASE}/api/admin/login`, { method: "POST", headers: loginHeaders(), body: JSON.stringify({ email: ADMIN_EMAIL, password: TEST_PASSWORD }) });
  const token = cookieFrom(loginRes);

  const preLogoutRes = await fetch(`${BASE}/admin`, { headers: { Cookie: `book_admin_session=${token}` } });
  assert.equal(preLogoutRes.status, 200);

  const logoutRes = await fetch(`${BASE}/api/admin/logout`, { method: "POST", headers: { Cookie: `book_admin_session=${token}` } });
  assert.equal(logoutRes.status, 200);

  const reuseRes = await fetch(`${BASE}/admin`, { headers: { Cookie: `book_admin_session=${token}` }, redirect: "manual" });
  assert.equal(reuseRes.status, 307);
  assert.match(reuseRes.headers.get("location") || "", /\/admin\/login$/);

  const reuseApiRes = await fetch(`${BASE}/api/admin/settings`, { method: "POST", headers: { "Content-Type": "application/json", Cookie: `book_admin_session=${token}` }, body: "{}" });
  assert.equal(reuseApiRes.status, 401);
});

test("10. role-protected operation returns 403 for insufficient privilege", async () => {
  const loginRes = await fetch(`${BASE}/api/admin/login`, { method: "POST", headers: loginHeaders(), body: JSON.stringify({ email: ADMIN_EMAIL, password: TEST_PASSWORD }) });
  const token = cookieFrom(loginRes);
  const res = await fetch(`${BASE}/api/admin/settings`, { method: "POST", headers: { "Content-Type": "application/json", Cookie: `book_admin_session=${token}` }, body: "{}" });
  assert.equal(res.status, 403);

  const superLoginRes = await fetch(`${BASE}/api/admin/login`, { method: "POST", headers: loginHeaders(), body: JSON.stringify({ email: SUPER_ADMIN_EMAIL, password: TEST_PASSWORD }) });
  const superToken = cookieFrom(superLoginRes);
  const current = await prisma.bookSettings.findFirstOrThrow();
  const superRes = await fetch(`${BASE}/api/admin/settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: `book_admin_session=${superToken}` },
    body: JSON.stringify({ title: current.title, description: current.description ?? undefined, prepaidPrice: current.prepaidPrice, bangladeshPostDeliveryCharge: current.bangladeshPostDeliveryCharge, courierDeliveryCharge: current.courierDeliveryCharge, courierAdvance: current.courierAdvance, bkashNumber: current.bkashNumber, nagadNumber: current.nagadNumber }),
  });
  assert.notEqual(superRes.status, 401);
  assert.notEqual(superRes.status, 403);
});

test("11. GET /admin/login with credentials in the query string does not authenticate anybody (and is scrubbed to a clean URL)", async () => {
  const res = await fetch(`${BASE}/admin/login?email=${encodeURIComponent(ADMIN_EMAIL)}&password=${encodeURIComponent(TEST_PASSWORD)}`, { redirect: "manual" });
  assert.equal(res.status, 307);
  assert.match(res.headers.get("location") || "", /\/admin\/login$/);
  assert.equal(res.headers.get("set-cookie"), null);
  const protectedRes = await fetch(`${BASE}/admin`, { redirect: "manual" });
  assert.equal(protectedRes.status, 307);
});

test("12. login form declares a POST fallback, never GET", async () => {
  const res = await fetch(`${BASE}/admin/login`);
  const html = await res.text();
  assert.match(html, /method="post"/);
  assert.match(html, /action="\/api\/admin\/login"/);
  assert.doesNotMatch(html, /method="get"/i);
});

test("13. no login response (success or failure) ever redirects with credentials in the URL", async () => {
  const badRes = await fetch(`${BASE}/api/admin/login`, { method: "POST", headers: loginHeaders(), body: JSON.stringify({ email: ADMIN_EMAIL, password: "wrong-password" }), redirect: "manual" });
  assert.equal(badRes.headers.get("location"), null);

  const goodRes = await fetch(`${BASE}/api/admin/login`, { method: "POST", headers: loginHeaders(), body: JSON.stringify({ email: ADMIN_EMAIL, password: TEST_PASSWORD }), redirect: "manual" });
  assert.equal(goodRes.headers.get("location"), null);
});

test("14. login handler never echoes the submitted password back in the response", async () => {
  const secretMarker = "wrong-password-marker-9f3c";
  const res = await fetch(`${BASE}/api/admin/login`, { method: "POST", headers: loginHeaders(), body: JSON.stringify({ email: ADMIN_EMAIL, password: secretMarker }) });
  const text = await res.text();
  assert.doesNotMatch(text, new RegExp(secretMarker));
  for (const [, value] of res.headers.entries()) {
    assert.doesNotMatch(value, new RegExp(secretMarker));
  }
});

test("15. /admin/login with credential-bearing query string redirects to a clean URL", async () => {
  const marker = "leak-marker-7a21";
  const res = await fetch(`${BASE}/admin/login?email=${encodeURIComponent(marker)}&password=${encodeURIComponent(marker)}`, { redirect: "manual" });
  assert.equal(res.status, 307);
  const location = res.headers.get("location") || "";
  assert.match(location, /\/admin\/login$/);
  assert.doesNotMatch(location, /[?&](email|password)=/);
  assert.doesNotMatch(location, new RegExp(marker));
});

test("16. /admin/login redirect never carries email/password values in the Location header, and plain /admin/login stays 200", async () => {
  const res = await fetch(`${BASE}/admin/login?password=another-marker-3fd9`, { redirect: "manual" });
  assert.equal(res.status, 307);
  assert.doesNotMatch(res.headers.get("location") || "", /another-marker-3fd9/);

  const plainRes = await fetch(`${BASE}/admin/login`);
  assert.equal(plainRes.status, 200);
});

test("17. /admin/login sets a no-referrer Referrer-Policy", async () => {
  const res = await fetch(`${BASE}/admin/login`);
  assert.equal(res.headers.get("referrer-policy"), "no-referrer");
});

test("18. unrelated localhost cookies from other apps are never trusted for admin auth", async () => {
  const res = await fetch(`${BASE}/admin`, {
    headers: { Cookie: "refresh_token=some-other-apps-token; session_id=unrelated-value; auth=not-book-admin" },
    redirect: "manual",
  });
  assert.equal(res.status, 307);
  assert.match(res.headers.get("location") || "", /\/admin\/login$/);
});

test("19. unknown email is rejected generically (401)", async () => {
  const res = await fetch(`${BASE}/api/admin/login`, { method: "POST", headers: loginHeaders(), body: JSON.stringify({ email: "no-such-admin@security-test.local", password: TEST_PASSWORD }) });
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.error, "Invalid email or password.");
});

test("20. successful login sets only the canonical book_admin_session cookie, nothing else", async () => {
  const res = await fetch(`${BASE}/api/admin/login`, { method: "POST", headers: loginHeaders(), body: JSON.stringify({ email: ADMIN_EMAIL, password: TEST_PASSWORD }) });
  const setCookieHeaders = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get("set-cookie") || ""];
  assert.equal(setCookieHeaders.length, 1);
  assert.match(setCookieHeaders[0], /^book_admin_session=/);
});

test("21. login still succeeds when unrelated localhost cookies from other apps are present", async () => {
  const res = await fetch(`${BASE}/api/admin/login`, {
    method: "POST",
    headers: loginHeaders({ Cookie: "refresh_token=some-other-apps-token; furtail_session=unrelated" }),
    body: JSON.stringify({ email: ADMIN_EMAIL, password: TEST_PASSWORD }),
  });
  assert.equal(res.status, 200);
  assert.ok(cookieFrom(res).length > 20);
});

test("22. email normalization: mixed case still authenticates (case-insensitive lookup)", async () => {
  const res = await fetch(`${BASE}/api/admin/login`, { method: "POST", headers: loginHeaders(), body: JSON.stringify({ email: ADMIN_EMAIL.toUpperCase(), password: TEST_PASSWORD }) });
  assert.equal(res.status, 200);
});

test("23. valid canonical (isolated test) admin credentials authenticate successfully end to end", async () => {
  const res = await fetch(`${BASE}/api/admin/login`, { method: "POST", headers: loginHeaders(), body: JSON.stringify({ email: ADMIN_EMAIL, password: TEST_PASSWORD }) });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body, { ok: true });
  const token = cookieFrom(res);
  const dashRes = await fetch(`${BASE}/admin`, { headers: { Cookie: `book_admin_session=${token}` } });
  assert.equal(dashRes.status, 200);
});

test("24. blank email is rejected as 400, not 401 (invalid request shape, not credential failure)", async () => {
  const res = await fetch(`${BASE}/api/admin/login`, { method: "POST", headers: loginHeaders(), body: JSON.stringify({ email: "", password: TEST_PASSWORD }) });
  assert.equal(res.status, 400);
});

test("25. malformed email is rejected as 400", async () => {
  const res = await fetch(`${BASE}/api/admin/login`, { method: "POST", headers: loginHeaders(), body: JSON.stringify({ email: "not-an-email", password: TEST_PASSWORD }) });
  assert.equal(res.status, 400);
});

test("26. blank password is rejected as 400", async () => {
  const res = await fetch(`${BASE}/api/admin/login`, { method: "POST", headers: loginHeaders(), body: JSON.stringify({ email: ADMIN_EMAIL, password: "" }) });
  assert.equal(res.status, 400);
});

test("27. malformed JSON body is rejected as 400, not a server error", async () => {
  const res = await fetch(`${BASE}/api/admin/login`, { method: "POST", headers: loginHeaders(), body: "{not valid json" });
  assert.equal(res.status, 400);
});

test("28. email with leading/trailing whitespace still authenticates (normalized before format validation)", async () => {
  const res = await fetch(`${BASE}/api/admin/login`, { method: "POST", headers: loginHeaders(), body: JSON.stringify({ email: `  ${ADMIN_EMAIL}  `, password: TEST_PASSWORD }) });
  assert.equal(res.status, 200);
});

test("29. exact browser form-submission JSON contract (plain string fields from FormData) authenticates successfully", async () => {
  const formLikeBody = { email: String(ADMIN_EMAIL), password: String(TEST_PASSWORD) };
  const res = await fetch(`${BASE}/api/admin/login`, { method: "POST", headers: loginHeaders(), body: JSON.stringify(formLikeBody) });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body, { ok: true });
});

test("30. an active canonical admin authenticates; the same admin deactivated cannot authenticate even with the correct password", async () => {
  const activeRes = await fetch(`${BASE}/api/admin/login`, { method: "POST", headers: loginHeaders(), body: JSON.stringify({ email: ADMIN_EMAIL, password: TEST_PASSWORD }) });
  assert.equal(activeRes.status, 200);

  await prisma.adminUser.update({ where: { email: ADMIN_EMAIL }, data: { isActive: false } });
  const inactiveRes = await fetch(`${BASE}/api/admin/login`, { method: "POST", headers: loginHeaders(), body: JSON.stringify({ email: ADMIN_EMAIL, password: TEST_PASSWORD }) });
  assert.equal(inactiveRes.status, 401);

  await prisma.adminUser.update({ where: { email: ADMIN_EMAIL }, data: { isActive: true } });
  const reactivatedRes = await fetch(`${BASE}/api/admin/login`, { method: "POST", headers: loginHeaders(), body: JSON.stringify({ email: ADMIN_EMAIL, password: TEST_PASSWORD }) });
  assert.equal(reactivatedRes.status, 200);
});

test("31. the deactivated placeholder scaffold admin account cannot authenticate", async () => {
  const res = await fetch(`${BASE}/api/admin/login`, { method: "POST", headers: loginHeaders(), body: JSON.stringify({ email: "admin@example.com", password: "change-me-before-bootstrap" }) });
  assert.equal(res.status, 401);
});

test("32. rerunning the upsert (bootstrap pattern) with a new password revokes prior sessions and the new password takes effect", async () => {
  const oldLoginRes = await fetch(`${BASE}/api/admin/login`, { method: "POST", headers: loginHeaders(), body: JSON.stringify({ email: ADMIN_EMAIL, password: TEST_PASSWORD }) });
  const oldToken = cookieFrom(oldLoginRes);
  assert.ok(oldToken.length > 20);

  const NEW_PASSWORD = "RotatedTestPass9876!";
  const newHash = await bcrypt.hash(NEW_PASSWORD, 10);
  const admin = await prisma.adminUser.upsert({ where: { email: ADMIN_EMAIL }, update: { passwordHash: newHash, role: "ADMIN", isActive: true }, create: { email: ADMIN_EMAIL, passwordHash: newHash, role: "ADMIN" } });
  await prisma.adminSession.updateMany({ where: { adminUserId: admin.id, revokedAt: null }, data: { revokedAt: new Date() } });

  const oldSessionRes = await fetch(`${BASE}/admin`, { headers: { Cookie: `book_admin_session=${oldToken}` }, redirect: "manual" });
  assert.equal(oldSessionRes.status, 307);

  const oldPasswordRes = await fetch(`${BASE}/api/admin/login`, { method: "POST", headers: loginHeaders(), body: JSON.stringify({ email: ADMIN_EMAIL, password: TEST_PASSWORD }) });
  assert.equal(oldPasswordRes.status, 401);

  const newPasswordRes = await fetch(`${BASE}/api/admin/login`, { method: "POST", headers: loginHeaders(), body: JSON.stringify({ email: ADMIN_EMAIL, password: NEW_PASSWORD }) });
  assert.equal(newPasswordRes.status, 200);

  // restore original test password hash so later/rerun tests in this file remain consistent
  const restoredHash = await bcrypt.hash(TEST_PASSWORD, 10);
  await prisma.adminUser.update({ where: { email: ADMIN_EMAIL }, data: { passwordHash: restoredHash } });
});

test("33. a native (pre-hydration) browser form fallback submits application/x-www-form-urlencoded, not JSON, and must still authenticate rather than 400 on schema", async () => {
  const params = new URLSearchParams({ email: ADMIN_EMAIL, password: TEST_PASSWORD });
  const res = await fetch(`${BASE}/api/admin/login`, {
    method: "POST",
    headers: loginHeaders({ "Content-Type": "application/x-www-form-urlencoded" }),
    body: params.toString(),
  });
  assert.equal(res.status, 200);
  assert.ok(cookieFrom(res).length > 20);
});

test("34. an email containing a pasted zero-width space (invisible formatting artifact) still authenticates once normalized", async () => {
  const zwsp = String.fromCharCode(0x200b);
  const [local, domain] = ADMIN_EMAIL.split("@");
  const dirtyEmail = `${local}${zwsp}@${domain}`;
  const res = await fetch(`${BASE}/api/admin/login`, { method: "POST", headers: loginHeaders(), body: JSON.stringify({ email: dirtyEmail, password: TEST_PASSWORD }) });
  assert.equal(res.status, 200);
});

test("35. wrong password submitted via the native form fallback still yields 401, not 400", async () => {
  const params = new URLSearchParams({ email: ADMIN_EMAIL, password: "wrong-password" });
  const res = await fetch(`${BASE}/api/admin/login`, {
    method: "POST",
    headers: loginHeaders({ "Content-Type": "application/x-www-form-urlencoded" }),
    body: params.toString(),
  });
  assert.equal(res.status, 401);
});
test("36. authenticated admin visiting /admin/login is redirected to /admin", async () => {
  // First login to get a cookie
  const loginRes = await fetch(`${BASE}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: TEST_PASSWORD })
  });
  const cookieHeader = loginRes.headers.get("set-cookie");
  const adminCookie = cookieHeader ? cookieHeader.split(";")[0] : "";
  
  // Now visit /admin/login
  const getRes = await fetch(`${BASE}/admin/login`, {
    headers: { Cookie: adminCookie },
    redirect: "manual"
  });
  assert.equal(getRes.status, 307, "Expected redirect when already logged in");
  const loc = getRes.headers.get("Location") || "";
  assert.ok(loc.endsWith("/admin"), "Expected to be redirected to /admin");
});
