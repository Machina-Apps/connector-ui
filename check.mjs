// Known outputs for the geometry. The DOM parts are checked by eye on the sites.
import assert from "node:assert/strict";
import { branch, neck } from "./index.js";

assert.equal(neck(100, 50, 8, "left"), "M92 50 Q100 50 100 42 V58 Q100 50 92 50 Z");
assert.equal(neck(100, 50, 8, "right"), "M108 50 Q100 50 100 42 V58 Q100 50 108 50 Z");
assert.equal(neck(10.04, 20.06, 13, "left"), "M-3 20.1 Q10 20.1 10 7.1 V33.1 Q10 20.1 -3 20.1 Z");
assert.equal(neck(100, 50, 6, "right", 9), "M106 50 Q100 50 100 41 V59 Q100 50 106 50 Z");
assert.equal(branch(12, 96, 80), "M12 80H96");

console.log("connector-ui: ok");
