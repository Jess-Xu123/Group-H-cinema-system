const test = require("node:test");
const assert = require("node:assert/strict");
const {
  getSeatNumbers,
  isActualSeatNumber,
  getBookableSeatCount,
} = require("../src/services/seatLayout");

test("returns actual seat labels in the visual S-shaped order", () => {
  assert.deepEqual(getSeatNumbers(1, 10), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(
    getSeatNumbers(2, 10),
    [21, 20, 19, 18, 17, 16, 15, 14, 12, 11],
  );
  assert.deepEqual(
    getSeatNumbers(3, 10),
    [22, 23, 24, 25, 26, 27, 28, 29, 30, 31],
  );
});

test("validates actual seat labels against their row", () => {
  assert.equal(isActualSeatNumber(2, 21, 10), true);
  assert.equal(isActualSeatNumber(2, 13, 10), false);
  assert.equal(isActualSeatNumber(3, 21, 10), false);
  assert.equal(isActualSeatNumber(13, 131, 10), false);
});

test("counts only seats that customers can select on the seat map", () => {
  assert.equal(getBookableSeatCount(10, 10), 99);
  assert.equal(getBookableSeatCount(20, 10), 189);
});
