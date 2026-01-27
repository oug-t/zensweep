import type { Cell } from '$lib/minesweeper';

/**
 * Represents the distinct actions a Vim command can trigger.
 */
export type VimAction =
	| { type: 'MOVE_CURSOR'; dx: number; dy: number }
	| { type: 'REVEAL' }
	| { type: 'FLAG' }
	| { type: 'SMART' }
	| { type: 'DIGIT'; value: string }
	| { type: 'ZERO' }
	| { type: 'GO_TOP' }
	| { type: 'GO_BOTTOM' }
	| { type: 'START_ROW' }
	| { type: 'NEXT_UNREVEALED' }
	| { type: 'PREV_UNREVEALED' }
	| { type: 'START_SEARCH' }
	| { type: 'NEXT_MATCH' }
	| { type: 'PREV_MATCH' }
	| null;

/**
 * Maps a key press to a specific Vim action or motion.
 * @param key - The keyboard event key value.
 */
export function handleVimKey(key: string): VimAction {
	if (/^[1-9]$/.test(key)) return { type: 'DIGIT', value: key };

	switch (key) {
		case '0':
			return { type: 'ZERO' };
		case '_':
			return { type: 'START_ROW' };

		case '/':
			return { type: 'START_SEARCH' };
		case 'n':
			return { type: 'NEXT_MATCH' };
		case 'N':
			return { type: 'PREV_MATCH' };

		case 'h':
		case 'ArrowLeft':
			return { type: 'MOVE_CURSOR', dx: -1, dy: 0 };
		case 'j':
		case 'ArrowDown':
			return { type: 'MOVE_CURSOR', dx: 0, dy: 1 };
		case 'k':
		case 'ArrowUp':
			return { type: 'MOVE_CURSOR', dx: 0, dy: -1 };
		case 'l':
		case 'ArrowRight':
			return { type: 'MOVE_CURSOR', dx: 1, dy: 0 };

		case '$':
			return { type: 'MOVE_CURSOR', dx: 999, dy: 0 };
		case 'G':
			return { type: 'GO_BOTTOM' };
		case 'g':
			return { type: 'GO_TOP' };

		case 'w':
			return { type: 'NEXT_UNREVEALED' };
		case 'b':
			return { type: 'PREV_UNREVEALED' };

		case 'i':
		case 'Enter':
			return { type: 'REVEAL' };
		case ' ':
			return { type: 'SMART' };
		case 'a':
			return { type: 'FLAG' };

		default:
			return null;
	}
}

/**
 * Calculates the destination coordinates for Vim motions.
 * Handles simple directions (for operators) and complex state-dependent jumps.
 */
export function calculateVimJump(
	key: string,
	multiplier: number,
	cursor: { r: number; c: number },
	grid: Cell[][],
	rows: number,
	cols: number
): { r: number; c: number } | null {
	let { r, c } = cursor;

	// Simple Directions
	if (key === 'h' || key === 'ArrowLeft') return { r, c: Math.max(0, c - multiplier) };
	if (key === 'l' || key === 'ArrowRight') return { r, c: Math.min(cols - 1, c + multiplier) };
	if (key === 'k' || key === 'ArrowUp') return { r: Math.max(0, r - multiplier), c };
	if (key === 'j' || key === 'ArrowDown') return { r: Math.min(rows - 1, r + multiplier), c };

	// Line Boundaries
	if (key === '0') return { r, c: 0 };
	if (key === '$') return { r, c: cols - 1 };
	if (key === 'g') return { r: 0, c };
	if (key === 'G') {
		const target = multiplier > 1 ? Math.min(rows - 1, multiplier - 1) : rows - 1;
		return { r: target, c };
	}

	// Complex Motions

	// 'w': Jump forward to next unrevealed cell
	if (key === 'w') {
		let index = r * cols + c;
		const total = rows * cols;
		for (let i = 0; i < multiplier; i++) {
			let scanned = 0;
			do {
				index = (index + 1) % total;
				scanned++;
			} while (scanned < total && grid[Math.floor(index / cols)][index % cols].isOpen);
		}
		return { r: Math.floor(index / cols), c: index % cols };
	}

	// 'b': Jump backward to previous unrevealed cell
	if (key === 'b') {
		let index = r * cols + c;
		const total = rows * cols;
		for (let i = 0; i < multiplier; i++) {
			let scanned = 0;
			do {
				index = (index - 1 + total) % total;
				scanned++;
			} while (scanned < total && grid[Math.floor(index / cols)][index % cols].isOpen);
		}
		return { r: Math.floor(index / cols), c: index % cols };
	}

	// '}': Jump DOWN to next row with unrevealed cells
	if (key === '}') {
		for (let i = 0; i < multiplier; i++) {
			if (r >= rows - 1) break;
			for (let nextR = r + 1; nextR < rows; nextR++) {
				const firstClosed = grid[nextR].findIndex((cell) => !cell.isOpen);
				if (firstClosed > -1) {
					r = nextR;
					c = firstClosed;
					break;
				}
				if (nextR === rows - 1) r = rows - 1;
			}
		}
		return { r, c };
	}

	// '{': Jump UP to previous row with unrevealed cells
	if (key === '{') {
		for (let i = 0; i < multiplier; i++) {
			if (r <= 0) break;
			for (let nextR = r - 1; nextR >= 0; nextR--) {
				const firstClosed = grid[nextR].findIndex((cell) => !cell.isOpen);
				if (firstClosed > -1) {
					r = nextR;
					c = firstClosed;
					break;
				}
				if (nextR === 0) r = 0;
			}
		}
		return { r, c };
	}

	return null;
}
