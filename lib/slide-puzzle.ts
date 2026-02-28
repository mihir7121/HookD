export type GridSize = 3 | 5 | 7;

export interface SlideBoard {
  size: GridSize;
  tiles: number[];
  blankIndex: number;
}

export function createSolvedBoard(size: GridSize): SlideBoard {
  const total = size * size;
  const tiles = Array.from({ length: total }, (_, i) => (i + 1) % total);
  return {
    size,
    tiles,
    blankIndex: total - 1,
  };
}

export function areAdjacent(a: number, b: number, size: number): boolean {
  const aRow = Math.floor(a / size);
  const aCol = a % size;
  const bRow = Math.floor(b / size);
  const bCol = b % size;
  return Math.abs(aRow - bRow) + Math.abs(aCol - bCol) === 1;
}

export function getMovableIndices(blankIndex: number, size: number): number[] {
  const row = Math.floor(blankIndex / size);
  const col = blankIndex % size;
  const indices: number[] = [];

  if (row > 0) indices.push(blankIndex - size);
  if (row < size - 1) indices.push(blankIndex + size);
  if (col > 0) indices.push(blankIndex - 1);
  if (col < size - 1) indices.push(blankIndex + 1);

  return indices;
}

export function moveTile(board: SlideBoard, tileIndex: number): SlideBoard {
  if (!areAdjacent(tileIndex, board.blankIndex, board.size)) {
    return board;
  }

  const nextTiles = [...board.tiles];
  nextTiles[board.blankIndex] = nextTiles[tileIndex];
  nextTiles[tileIndex] = 0;

  return {
    ...board,
    tiles: nextTiles,
    blankIndex: tileIndex,
  };
}

export function isSolved(board: SlideBoard): boolean {
  const total = board.size * board.size;
  for (let i = 0; i < total; i++) {
    if (board.tiles[i] !== (i + 1) % total) {
      return false;
    }
  }
  return true;
}

export function scrambleByValidMoves(size: GridSize, steps = size * size * 14): SlideBoard {
  let board = createSolvedBoard(size);
  let previousBlank = -1;

  for (let i = 0; i < steps; i++) {
    const candidates = getMovableIndices(board.blankIndex, size).filter(
      (index) => index !== previousBlank
    );
    const source = candidates.length > 0 ? candidates : getMovableIndices(board.blankIndex, size);
    const chosen = source[Math.floor(Math.random() * source.length)];
    previousBlank = board.blankIndex;
    board = moveTile(board, chosen);
  }

  return board;
}

export function boardSignature(input: SlideBoard | number[]): string {
  const tiles = Array.isArray(input) ? input : input.tiles;
  return tiles.join(",");
}

export function scrambleUniqueBoard(
  size: GridSize,
  usedSignatures: Set<string>,
  steps = size * size * 14,
  maxAttempts = 300
): SlideBoard {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const board = scrambleByValidMoves(size, steps);
    if (isSolved(board)) continue;

    const signature = boardSignature(board);
    if (usedSignatures.has(signature)) continue;

    usedSignatures.add(signature);
    return board;
  }

  usedSignatures.clear();
  const fallback = scrambleByValidMoves(size, steps);
  usedSignatures.add(boardSignature(fallback));
  return fallback;
}

export function parMovesBySize(size: GridSize): number {
  if (size === 3) return 35;
  if (size === 5) return 140;
  return 380;
}
