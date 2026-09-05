import assert from "node:assert/strict";
import test from "node:test";
import { buildLoginRequestBody, normalizeLoginEmail } from "../src/lib/admin-validation";

const ZWSP = String.fromCharCode(0x200b);
const ZWNJ = String.fromCharCode(0x200c);
const ZWJ = String.fromCharCode(0x200d);
const BOM = String.fromCharCode(0xfeff);

test("normalizeLoginEmail: trims outer whitespace and lowercases", () => {
  assert.equal(normalizeLoginEmail("  Admin@Example.com  "), "admin@example.com");
});

test("normalizeLoginEmail: strips zero-width space, ZWNJ, ZWJ, and BOM", () => {
  assert.equal(normalizeLoginEmail(`ad${ZWSP}min@example.com`), "admin@example.com");
  assert.equal(normalizeLoginEmail(`admin${ZWNJ}@example.com`), "admin@example.com");
  assert.equal(normalizeLoginEmail(`admin@ex${ZWJ}ample.com`), "admin@example.com");
  assert.equal(normalizeLoginEmail(`${BOM}admin@example.com`), "admin@example.com");
});

test("normalizeLoginEmail: does not touch internal ordinary whitespace (stays invalid, not silently mangled)", () => {
  assert.equal(normalizeLoginEmail("ad min@example.com"), "ad min@example.com");
});

test("buildLoginRequestBody: normal email/password builds the exact fetch contract", () => {
  const result = buildLoginRequestBody("Admin@Example.com", "secret123");
  assert.deepEqual(result, { ok: true, body: { email: "admin@example.com", password: "secret123" } });
});

test("buildLoginRequestBody: uppercase email is normalized before being sent", () => {
  const result = buildLoginRequestBody("ADMIN@EXAMPLE.COM", "secret123");
  assert.equal(result.ok, true);
  assert.equal(result.ok && result.body.email, "admin@example.com");
});

test("buildLoginRequestBody: outer whitespace around email is normalized before being sent", () => {
  const result = buildLoginRequestBody("  admin@example.com  ", "secret123");
  assert.equal(result.ok, true);
  assert.equal(result.ok && result.body.email, "admin@example.com");
});

test("buildLoginRequestBody: a copied email containing a zero-width space is normalized before being sent", () => {
  const result = buildLoginRequestBody(`admin${ZWSP}@example.com`, "secret123");
  assert.equal(result.ok, true);
  assert.equal(result.ok && result.body.email, "admin@example.com");
});

test("buildLoginRequestBody: empty email is blocked client-side, not sent to the server", () => {
  const result = buildLoginRequestBody("", "secret123");
  assert.deepEqual(result, { ok: false, error: "empty_email" });
});

test("buildLoginRequestBody: whitespace-only email is blocked client-side as empty", () => {
  const result = buildLoginRequestBody("   ", "secret123");
  assert.deepEqual(result, { ok: false, error: "empty_email" });
});

test("buildLoginRequestBody: malformed email is blocked client-side, not sent to the server", () => {
  const result = buildLoginRequestBody("not-an-email", "secret123");
  assert.deepEqual(result, { ok: false, error: "invalid_email" });
});

test("buildLoginRequestBody: empty password is blocked client-side, not sent to the server", () => {
  const result = buildLoginRequestBody("admin@example.com", "");
  assert.deepEqual(result, { ok: false, error: "empty_password" });
});

test("buildLoginRequestBody: password is never normalized or mutated", () => {
  const result = buildLoginRequestBody("admin@example.com", "  Secret With Spaces  ");
  assert.equal(result.ok, true);
  assert.equal(result.ok && result.body.password, "  Secret With Spaces  ");
});
