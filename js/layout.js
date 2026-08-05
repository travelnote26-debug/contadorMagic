"use strict";

function computeLayout(players) {
  const n = players.length;
  if (n === 0) return [];

  const totalRows = n <= 2 ? n : Math.ceil(n / 2);
  const cols = n <= 2 ? 1 : 2;

  const grid = Array.from({ length: totalRows }, () => Array(cols).fill(null));
  let idx = 0;

  for (let row = totalRows - 1; row >= 0; row--) {
    for (let col = 0; col < cols; col++) {
      if (idx < n) {
        grid[row][col] = players[idx];
        idx++;
      }
    }
  }

  return grid.map((row, rowIdx) =>
    row
      .map((player, colIdx) =>
        player == null
          ? null
          : { player, rotation: computeRotation(rowIdx, colIdx, totalRows, cols, n) }
      )
      .filter((cell) => cell != null)
  );
}

function computeRotation(rowIdx, colIdx, totalRows, totalCols, n) {
  if (totalRows <= 1) return 0;
  if (totalRows === 2 && totalCols === 2) {
    if (n === 3 && rowIdx === 0) return 180;
    return colIdx === 0 ? 90 : -90;
  }
  if (totalRows === 3 && totalCols === 2) {
    if (n === 5 && rowIdx === 0) return 180;
    return colIdx === 0 ? 90 : -90;
  }
  if (rowIdx === totalRows - 1) return 0;
  if (rowIdx === 0) return 180;
  return colIdx === 0 ? 90 : -90;
}
