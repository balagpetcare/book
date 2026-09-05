import assert from "node:assert/strict";
import test from "node:test";
import { cancelOrder, restockReturned, validateReview, verifyPayment } from "../src/lib/domain-rules";

test("payment verify decrements stock once", () => { const first = verifyPayment({ payment: "SUBMITTED", stock: 10, quantity: 1 }); assert.deepEqual(first, { payment: "VERIFIED", stock: 9, changed: true }); const second = verifyPayment({ payment: first.payment, stock: first.stock, quantity: 1 }); assert.equal(second.changed, false); assert.equal(second.stock, 9); });
test("duplicate verification cannot decrement twice", () => { assert.throws(() => verifyPayment({ payment: "SUBMITTED", stock: 0, quantity: 1 }), /insufficient/); });
test("cancellation restores paid stock before shipping", () => { assert.equal(cancelOrder({ order: "CONFIRMED", paid: true, restored: false, quantity: 2 }).restoration, 2); assert.equal(cancelOrder({ order: "CONFIRMED", paid: true, restored: true, quantity: 2 }).restoration, 0); });
test("returned restock requires explicit action", () => { assert.throws(() => restockReturned({ order: "DELIVERED", restored: false, quantity: 1 }), /returned/); assert.equal(restockReturned({ order: "RETURNED", restored: false, quantity: 1 }), 1); });
test("review requires delivered order and matching mobile", () => { assert.equal(validateReview({ orderStatus: "DELIVERED", mobileMatches: true, alreadyReviewed: false }), true); assert.throws(() => validateReview({ orderStatus: "SHIPPED", mobileMatches: true, alreadyReviewed: false })); assert.throws(() => validateReview({ orderStatus: "DELIVERED", mobileMatches: false, alreadyReviewed: false })); assert.throws(() => validateReview({ orderStatus: "DELIVERED", mobileMatches: true, alreadyReviewed: true })); });
