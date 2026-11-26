const NUMBERED_SEATS_PER_ROW = 10;
const AISLE_ROW_NUMBER = 13;

function getSeatNumbers(row, seatsPerRow) {
  const rowNumber = Number(row);
  const seatCount = Number(seatsPerRow);

  if (
    !Number.isInteger(rowNumber) ||
    rowNumber < 0 ||
    !Number.isInteger(seatCount) ||
    seatCount <= 0 ||
    rowNumber === AISLE_ROW_NUMBER
  ) {
    return [];
  }

  if (rowNumber === 0) {
    return Array.from({ length: seatCount }, (_, index) => index + 1);
  }

  const firstSeat =
    rowNumber === 1
      ? 1
      : rowNumber === 2
        ? NUMBERED_SEATS_PER_ROW + 1
        : (rowNumber - 1) * NUMBERED_SEATS_PER_ROW + 2;
  const lastSeat =
    rowNumber === 1 ? seatCount : rowNumber * NUMBERED_SEATS_PER_ROW + 1;

  if (lastSeat < firstSeat) return [];

  const numbers = Array.from(
    { length: lastSeat - firstSeat + 1 },
    (_, index) => firstSeat + index,
  ).filter((number) => number !== 13);

  return rowNumber % 2 === 0 ? numbers.reverse() : numbers;
}

function isActualSeatNumber(row, seatNumber, seatsPerRow) {
  return getSeatNumbers(row, seatsPerRow).includes(Number(seatNumber));
}

function getBookableSeatCount(totalRows, seatsPerRow) {
  const rowCount = Number(totalRows);

  if (!Number.isInteger(rowCount) || rowCount < 1) return 0;

  return Array.from({ length: rowCount }, (_, index) => index + 1).reduce(
    (count, row) =>
      count +
      getSeatNumbers(row, seatsPerRow).filter(
        (seatNumber) => !(row === 1 && seatNumber === 1),
      ).length,
    0,
  );
}

module.exports = {
  getSeatNumbers,
  isActualSeatNumber,
  getBookableSeatCount,
};
