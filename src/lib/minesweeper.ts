// src/lib/minesweeper.ts

export type Cell = {
	row: number;
	col: number;
	isMine: boolean;
	isOpen: boolean;
	isFlagged: boolean;
	neighborCount: number;
};

export const DIRECTIONS = [
	[-1, -1],
	[-1, 0],
	[-1, 1],
	[0, -1],
	[0, 1],
	[1, -1],
	[1, 0],
	[1, 1]
];

// 1. Create an EMPTY Board (No mines yet)
export function createGrid(rows: number, cols: number): Cell[][] {
	return Array.from({ length: rows }, (_, r) =>
		Array.from({ length: cols }, (_, c) => ({
			row: r,
			col: c,
			isMine: false,
			isOpen: false,
			isFlagged: false,
			neighborCount: 0
		}))
	);
}

// 2. Place Mines (Run this ON THE FIRST CLICK)
export function placeMines(grid: Cell[][], mines: number, firstClick: { r: number; c: number }) {
	const rows = grid.length;
	const cols = grid[0].length;
	let minesPlaced = 0;

	// Define the "Safe Zone" (The clicked cell + its 8 neighbors)
	const safeZone = new Set<string>();
	safeZone.add(`${firstClick.r},${firstClick.c}`);

	DIRECTIONS.forEach(([dr, dc]) => {
		const nr = firstClick.r + dr;
		const nc = firstClick.c + dc;
		if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
			safeZone.add(`${nr},${nc}`);
		}
	});

	// Randomly place mines
	while (minesPlaced < mines) {
		const r = Math.floor(Math.random() * rows);
		const c = Math.floor(Math.random() * cols);

		if (grid[r][c].isMine || safeZone.has(`${r},${c}`)) continue;

		grid[r][c].isMine = true;
		minesPlaced++;
	}

	// Calculate Numbers
	for (let r = 0; r < rows; r++) {
		for (let c = 0; c < cols; c++) {
			if (grid[r][c].isMine) continue;

			let count = 0;
			DIRECTIONS.forEach(([dr, dc]) => {
				const nr = r + dr,
					nc = c + dc;
				if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc].isMine) {
					count++;
				}
			});
			grid[r][c].neighborCount = count;
		}
	}
}

export function revealCell(
	grid: Cell[][],
	r: number,
	c: number
): { grid: Cell[][]; gameOver: boolean; win: boolean } {
	const cell = grid[r][c];

	if (cell.isOpen || cell.isFlagged) return { grid, gameOver: false, win: false };

	if (cell.isMine) {
		cell.isOpen = true;
		return { grid, gameOver: true, win: false };
	}

	cell.isOpen = true;

	if (cell.neighborCount === 0) {
		DIRECTIONS.forEach(([dr, dc]) => {
			const nr = r + dr,
				nc = c + dc;
			if (nr >= 0 && nr < grid.length && nc >= 0 && nc < grid[0].length) {
				revealCell(grid, nr, nc);
			}
		});
	}

	return { grid, gameOver: false, win: false };
}

export function countFlagsAround(grid: Cell[][], r: number, c: number) {
	let flagsAround = 0;
	DIRECTIONS.forEach(([dr, dc]) => {
		const nr = r + dr,
			nc = c + dc;
		if (nr >= 0 && nr < grid.length && nc >= 0 && nc < grid[0].length) {
			flagsAround += grid[nr][nc].isFlagged ? 1 : 0;
		}
	});
	return flagsAround;
}

export function revealCellsAround(
	grid: Cell[][],
	r: number,
	c: number
): { grid: Cell[][]; gameOver: boolean; win: boolean } {
	let gameOver = false;
	let win = false;
	DIRECTIONS.forEach(([dr, dc]) => {
		const nr = r + dr,
			nc = c + dc;
		if (nr >= 0 && nr < grid.length && nc >= 0 && nc < grid[0].length) {
			if (grid[nr][nc].isFlagged) return;

			const result = revealCell(grid, nr, nc);
			if (result.gameOver) {
				gameOver = true;
			}
			if (result.win) {
				win = true;
			}
		}
	});

	return { grid, gameOver, win };
}

// src/lib/minesweeper.ts

export function calculate3BV(grid: Cell[][]): number {
	let bbb = 0;
	const rows = grid.length;
	const cols = grid[0].length;
	const visited = Array.from({ length: rows }, () => Array(cols).fill(false));

	// 1. Count "Openings" (islands of 0s)
	for (let r = 0; r < rows; r++) {
		for (let c = 0; c < cols; c++) {
			const cell = grid[r][c];
			// If it's a safe, zero-neighbor cell we haven't processed yet
			if (!cell.isMine && cell.neighborCount === 0 && !visited[r][c]) {
				bbb++;
				// Flood fill to mark this entire opening as "1 click"
				const stack = [{ r, c }];
				while (stack.length > 0) {
					const current = stack.pop()!;
					if (visited[current.r][current.c]) continue;
					visited[current.r][current.c] = true;

					// If it's a zero, add neighbors to stack
					if (grid[current.r][current.c].neighborCount === 0) {
						for (let dr = -1; dr <= 1; dr++) {
							for (let dc = -1; dc <= 1; dc++) {
								if (dr === 0 && dc === 0) continue;
								const nr = current.r + dr;
								const nc = current.c + dc;
								if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
									if (!visited[nr][nc]) stack.push({ r: nr, c: nc });
								}
							}
						}
					}
				}
			}
		}
	}

	// 2. Count remaining safe cells that weren't part of an opening
	for (let r = 0; r < rows; r++) {
		for (let c = 0; c < cols; c++) {
			if (!grid[r][c].isMine && !visited[r][c]) {
				bbb++;
			}
		}
	}

	return bbb;
}
