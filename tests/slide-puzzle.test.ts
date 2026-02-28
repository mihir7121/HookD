import test from "node:test";
import assert from "node:assert/strict";
import {
  areAdjacent,
  boardSignature,
  createSolvedBoard,
  getMovableIndices,
  isSolved,
  moveTile,
  scrambleUniqueBoard,
  type GridSize,
} from "../lib/slide-puzzle";

function inversionCount(tiles: number[]): number {
  const values = tiles.filter((v) => v !== 0);
  let count = 0;
  for (let i = 0; i < values.length; i++) {
    for (let j = i + 1; j < values.length; j++) {
      if (values[i] > values[j]) count++;
    }
  }
  return count;
}

function isSolvableByParity(tiles: number[], size: number): boolean {
  const inversions = inversionCount(tiles);
  if (size % 2 === 1) {
    return inversions % 2 === 0;
  }

  const blankIndex = tiles.indexOf(0);
  const blankRowFromBottom = size - Math.floor(blankIndex / size);
  if (blankRowFromBottom % 2 === 0) {
    return inversions % 2 === 1;
  }
  return inversions % 2 === 0;
}

test("createSolvedBoard returns solved board with trailing blank", () => {
  const board = createSolvedBoard(3);
  assert.equal(board.blankIndex, 8);
  assert.deepEqual(board.tiles, [1, 2, 3, 4, 5, 6, 7, 8, 0]);
  assert.equal(isSolved(board), true);
});

test("areAdjacent correctly identifies orthogonal neighbors only", () => {
  assert.equal(areAdjacent(0, 1, 3), true);
  assert.equal(areAdjacent(0, 3, 3), true);
  assert.equal(areAdjacent(0, 4, 3), false);
  assert.equal(areAdjacent(1, 5, 3), false);
});

test("getMovableIndices returns expected neighbors for corner, edge, center blanks", () => {
  assert.deepEqual(getMovableIndices(0, 3).sort((a, b) => a - b), [1, 3]);
  assert.deepEqual(getMovableIndices(1, 3).sort((a, b) => a - b), [0, 2, 4]);
  assert.deepEqual(getMovableIndices(4, 3).sort((a, b) => a - b), [1, 3, 5, 7]);
});

test("moveTile only moves adjacent tile and swaps with blank", () => {
  const solved = createSolvedBoard(3);
  const invalidMove = moveTile(solved, 0);
  assert.deepEqual(invalidMove.tiles, solved.tiles);
  assert.equal(invalidMove.blankIndex, solved.blankIndex);

  const validMove = moveTile(solved, 7);
  assert.deepEqual(validMove.tiles, [1, 2, 3, 4, 5, 6, 7, 0, 8]);
  assert.equal(validMove.blankIndex, 7);
  assert.equal(isSolved(validMove), false);
});

for (const size of [3, 5, 7] as GridSize[]) {
  test(`scrambleUniqueBoard(${size}x${size}) creates solvable unsolved unique boards`, () => {
    const used = new Set<string>();
    const iterations = 120;

    for (let i = 0; i < iterations; i++) {
      const board = scrambleUniqueBoard(size, used);
      const sig = boardSignature(board);

      assert.equal(board.size, size);
      assert.equal(isSolved(board), false);
      assert.equal(isSolvableByParity(board.tiles, size), true);
      assert.equal(sig.length > 0, true);
    }

    assert.equal(used.size, iterations);
  });
}
