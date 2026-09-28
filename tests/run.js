import assert from "node:assert";
import { pairOf, leftOf } from "../bcd.js";
import { step, close } from "../bcdrun.js";
import { render } from "../app.js";

const base = {
  budget: 1,
  state: { bytes: [], buffer: "", ledger: [], applied: [] },
  events: [{ id: 1, kind: "feed", text: "12" }],
  bad_digit_code: "E_BAD_DIGIT", short_code: "E_SHORT",
  event_error_code: "E_BAD_EVENT"
};

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("pairOf returns text", () => {
  assert.strictEqual(typeof pairOf("12"), "string");
});

check("leftOf returns text", () => {
  assert.strictEqual(typeof leftOf("123"), "string");
});

check("step returns a state", () => {
  assert.strictEqual(typeof step(base).state, "object");
});

check("close returns a state", () => {
  assert.strictEqual(typeof close(base).state, "object");
});

check("render counts events", () => {
  assert.strictEqual(typeof render(base).count_events, "number");
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
